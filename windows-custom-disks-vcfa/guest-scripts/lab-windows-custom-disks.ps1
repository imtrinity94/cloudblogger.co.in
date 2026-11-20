# lab-windows-custom-disks.ps1
# Resource element: LAB/Scripts/lab-windows-custom-disks.ps1
#
# Brings the extra disks of a "LAB - Windows - Custom Disks" VM online and gives each one the
# drive letter and NTFS volume label chosen on the request. Run by "Guest OS Script
# Engine" (scriptType = powershell), called from the Compute Post Provision EBS
# "LAB - EBS - CompProv Post - Configure Windows Disks". The engine replaces these
# placeholders (in square brackets, below) from its scriptVariables input:
#   LAB_VM_DISKS       every SCSI disk of the VM as vSphere sees it: bus:unit:sizeGb,bus:unit:sizeGb,...
#   LAB_DISK_REQUESTS  disks to configure: bus|unit|letter|label;bus|unit|letter|label;...
#
# How a requested SCSI bus:unit is found in Windows:
#   Win32_DiskDrive gives SCSIPort (one per controller) and SCSITargetId (= vSphere unit number).
#   The SCSIPort numbers do not follow the vSphere bus numbers, so each port is matched to the bus
#   whose set of unit:size pairs is the same. Two controllers with an identical layout cannot be told
#   apart and are reported as an error instead of guessed.
#
# Safe to run again: an existing data partition only gets its letter and label corrected.
# A CD/DVD drive that holds a requested letter is moved to the highest free letter.
# Output lines LAB_DISK=<bus>:<unit>=<letter>:<label>:<sizeGb>GB per configured disk; the last line
# is LAB_RESULT=<number of failed disks> (99 = the script itself failed).
# No "exit" on purpose: the engine wraps it and pipes this script into Out-File.
# Log: C:\ProgramData\LAB\Logs\custom-disks.log
# Keep this file plain ASCII.

$ErrorActionPreference = 'Stop'

$vmDisksRaw  = '[LAB_VM_DISKS]'
$requestsRaw = '[LAB_DISK_REQUESTS]'

$logDir  = 'C:\ProgramData\LAB\Logs'
$logFile = Join-Path $logDir 'custom-disks.log'
if (-not (Test-Path $logDir)) { New-Item -Path $logDir -ItemType Directory -Force | Out-Null }

function Write-Log {
    param([string]$Message)
    $line = '{0} {1}' -f (Get-Date -Format 's'), $Message
    Add-Content -Path $logFile -Value $line
    Write-Output $line
}

function Get-UsedLetters {
    $letters = @()
    foreach ($v in @(Get-CimInstance -ClassName Win32_Volume)) {
        if ($v.DriveLetter) { $letters += $v.DriveLetter.TrimEnd(':').ToUpper() }
    }
    foreach ($p in @(Get-Partition)) {
        if ([int][char]$p.DriveLetter -ne 0) { $letters += ([string]$p.DriveLetter).ToUpper() }
    }
    return @($letters | Select-Object -Unique)
}

$failed = 0
Write-Log '===== LAB custom disks started ====='
Write-Log ('vSphere disks: {0}' -f $vmDisksRaw)
Write-Log ('Requests: {0}' -f $requestsRaw)

try {
    Update-HostStorageCache

    # ------------------------------------------------ requests
    $requests = @()
    foreach ($r in ($requestsRaw -split ';')) {
        if ($r -eq '') { continue }
        $p = $r -split '\|'
        $requests += [pscustomobject]@{
            Bus    = [int]$p[0]
            Unit   = [int]$p[1]
            Letter = $p[2].ToUpper()
            Label  = $p[3]
        }
    }
    if ($requests.Count -eq 0) { Write-Log 'Nothing requested' }

    # ------------------------------------------------ vSphere view: bus -> unit:size list
    $vsphere = @{}
    foreach ($entry in ($vmDisksRaw -split ',')) {
        if ($entry -eq '') { continue }
        $p = $entry -split ':'
        $bus = [int]$p[0]
        if (-not $vsphere.ContainsKey($bus)) { $vsphere[$bus] = @() }
        $vsphere[$bus] += ('{0}:{1}' -f [int]$p[1], [int]$p[2])
    }

    # ------------------------------------------------ guest view: SCSI port -> target:size list
    $disksByNumber = @{}
    foreach ($d in @(Get-Disk)) { $disksByNumber[[int]$d.Number] = $d }
    $guest = @{}
    $guestDrives = @()
    foreach ($dd in @(Get-CimInstance -ClassName Win32_DiskDrive)) {
        if (-not $disksByNumber.ContainsKey([int]$dd.Index)) { continue }
        $disk = $disksByNumber[[int]$dd.Index]
        $sizeGb = [int][math]::Round($disk.Size / 1GB)
        $port = [int]$dd.SCSIPort
        $target = [int]$dd.SCSITargetId
        if (-not $guest.ContainsKey($port)) { $guest[$port] = @() }
        $guest[$port] += ('{0}:{1}' -f $target, $sizeGb)
        $guestDrives += [pscustomobject]@{ Port = $port; Target = $target; Number = [int]$disk.Number; SizeGb = $sizeGb }
        Write-Log ('Guest disk {0}: SCSI port {1} target {2}, {3} GB, {4}, offline={5}' -f $disk.Number, $port, $target, $sizeGb, $disk.PartitionStyle, $disk.IsOffline)
    }

    # ------------------------------------------------ match SCSI ports to vSphere buses
    $busToPort = @{}
    foreach ($bus in $vsphere.Keys) {
        $sig = (@($vsphere[$bus]) | Sort-Object) -join ','
        $hits = @($guest.Keys | Where-Object { ((@($guest[$_]) | Sort-Object) -join ',') -eq $sig })
        if ($hits.Count -eq 1) {
            $busToPort[$bus] = $hits[0]
            Write-Log ('vSphere SCSI bus {0} = guest SCSI port {1} ({2})' -f $bus, $hits[0], $sig)
        }
        elseif ($hits.Count -eq 0) {
            Write-Log ('WARNING: no guest SCSI port has the layout of bus {0} ({1})' -f $bus, $sig)
        }
        else {
            Write-Log ('WARNING: bus {0} layout ({1}) matches {2} guest ports, cannot tell them apart' -f $bus, $sig, $hits.Count)
        }
    }

    # ------------------------------------------------ free requested letters held by CD/DVD drives
    $wanted = @($requests | ForEach-Object { $_.Letter })
    $used = Get-UsedLetters
    $freeLetters = @([char[]](90..68) | ForEach-Object { [string]$_ } | Where-Object { ($used -notcontains $_) -and ($wanted -notcontains $_) })
    foreach ($cd in @(Get-CimInstance -ClassName Win32_Volume -Filter 'DriveType=5')) {
        if (-not $cd.DriveLetter) { continue }
        $cdLetter = $cd.DriveLetter.TrimEnd(':').ToUpper()
        if ($wanted -notcontains $cdLetter) { continue }
        if ($freeLetters.Count -eq 0) { throw ('no free letter to move the CD/DVD drive off {0}:' -f $cdLetter) }
        $to = $freeLetters[0]
        $freeLetters = @($freeLetters | Select-Object -Skip 1)
        Set-CimInstance -InputObject $cd -Property @{ DriveLetter = ($to + ':') }
        Write-Log ('Moved CD/DVD drive {0}: to {1}:' -f $cdLetter, $to)
    }

    # ------------------------------------------------ configure each requested disk
    foreach ($req in $requests) {
        $tag = 'SCSI {0}:{1} -> {2}: [{3}]' -f $req.Bus, $req.Unit, $req.Letter, $req.Label
        try {
            if (-not $busToPort.ContainsKey($req.Bus)) { throw ('SCSI bus {0} could not be matched to a guest SCSI port' -f $req.Bus) }
            $drive = @($guestDrives | Where-Object { $_.Port -eq $busToPort[$req.Bus] -and $_.Target -eq $req.Unit }) | Select-Object -First 1
            if (-not $drive) { throw 'disk not found in the guest' }
            $n = $drive.Number
            $disk = Get-Disk -Number $n
            if ($disk.IsBoot -or $disk.IsSystem) { throw ('disk {0} is the boot/system disk, not touching it' -f $n) }

            if ($disk.IsOffline)  { Set-Disk -Number $n -IsOffline $false }
            if ($disk.IsReadOnly) { Set-Disk -Number $n -IsReadOnly $false }
            $disk = Get-Disk -Number $n
            if ($disk.PartitionStyle -eq 'RAW') {
                Initialize-Disk -Number $n -PartitionStyle GPT
                Write-Log ('{0}: disk {1} initialized as GPT' -f $tag, $n)
            }

            $part = @(Get-Partition -DiskNumber $n | Where-Object { $_.Type -eq 'Basic' }) | Select-Object -First 1
            if (-not $part) {
                if ((Get-UsedLetters) -contains $req.Letter) { throw ('drive letter {0}: is already in use' -f $req.Letter) }
                $part = New-Partition -DiskNumber $n -UseMaximumSize -DriveLetter $req.Letter
                Write-Log ('{0}: partition created on disk {1}' -f $tag, $n)
            }
            elseif (([string]$part.DriveLetter).ToUpper() -ne $req.Letter) {
                if ((Get-UsedLetters) -contains $req.Letter) { throw ('drive letter {0}: is already in use' -f $req.Letter) }
                Set-Partition -DiskNumber $n -PartitionNumber $part.PartitionNumber -NewDriveLetter $req.Letter
                Write-Log ('{0}: existing partition moved to {1}:' -f $tag, $req.Letter)
            }

            $vol = Get-Volume -DriveLetter $req.Letter
            if ([string]::IsNullOrEmpty($vol.FileSystem)) {
                Format-Volume -DriveLetter $req.Letter -FileSystem NTFS -NewFileSystemLabel $req.Label -Confirm:$false | Out-Null
                Write-Log ('{0}: formatted NTFS' -f $tag)
            }
            elseif ($vol.FileSystemLabel -ne $req.Label) {
                Set-Volume -DriveLetter $req.Letter -NewFileSystemLabel $req.Label
                Write-Log ('{0}: label set' -f $tag)
            }

            $vol = Get-Volume -DriveLetter $req.Letter
            Write-Log ('{0}: OK ({1}, {2} GB)' -f $tag, $vol.FileSystem, [int][math]::Round($vol.Size / 1GB))
            Write-Output ('LAB_DISK={0}:{1}={2}:{3}:{4}GB' -f $req.Bus, $req.Unit, $req.Letter, $vol.FileSystemLabel, $drive.SizeGb)
        }
        catch {
            Write-Log ('{0}: ERROR {1}' -f $tag, $_.Exception.Message)
            $failed++
        }
    }
}
catch {
    Write-Log ('ERROR {0}' -f $_.Exception.Message)
    $failed = 99
}

Write-Log ('===== Finished, {0} failed =====' -f $failed)
Write-Output ('LAB_RESULT={0}' -f $failed)
