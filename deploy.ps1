# Runs hugo in source dir and overwrites previous build in destination folder.
# Overwrites files in destination folder but does not delete other files.

$SRC = './'
$INTERMEDIATE = './public'
$DEST = '../hazrmard.github.io'

If(!(test-path $INTERMEDIATE))
{
    New-Item -ItemType Directory -Force -Path $INTERMEDIATE
} else {
    Remove-Item -Path "$INTERMEDIATE/*" -Recurse -Force
}

& hugo.exe -s $SRC -d $INTERMEDIATE --minify | Out-Null

Copy-Item -Path "$INTERMEDIATE/*" -Destination $DEST -Force -Recurse
Remove-Item -Path $INTERMEDIATE -Recurse -Force