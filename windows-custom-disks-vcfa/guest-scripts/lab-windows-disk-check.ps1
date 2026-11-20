$ErrorActionPreference = 'Stop'
Get-Volume | Where-Object { $_.DriveLetter } | Sort-Object DriveLetter | ForEach-Object { Write-Output ('VOL={0}|{1}|{2}|{3}GB|{4}' -f $_.DriveLetter, $_.FileSystemLabel, $_.FileSystem, [int][math]::Round($_.Size/1GB), $_.DriveType) }
Get-Disk | Sort-Object Number | ForEach-Object { Write-Output ('DISK={0}|{1}|{2}|offline={3}|{4}GB' -f $_.Number, $_.PartitionStyle, $_.OperationalStatus, $_.IsOffline, [int][math]::Round($_.Size/1GB)) }
Write-Output ('BOOT=' + (Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToString('s'))
Write-Output 'CHECK_DONE'
