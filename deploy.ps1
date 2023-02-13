# Runs hugo in source dir and overwrites previous build in destination folder.
# Overwrites files in destination folder but does not delete other files.

$SRC = './'
$INTERMEDIATE = "$HOME/_hugo_public"
$DEST = '../hazrmard.github.io'

If(!(test-path $INTERMEDIATE))
{
    New-Item -ItemType Directory -Force -Path $INTERMEDIATE
} else {
    Remove-Item -Path "$INTERMEDIATE/*" -Recurse -Force
}

& hugo.exe -s $SRC -d $INTERMEDIATE --minify

Remove-Item -Path "$DEST/*" -Recurse -Force -Exclude '.git*','desktop.ini'
Copy-Item -Path "$INTERMEDIATE/*" -Destination $DEST -Force -Recurse -Exclude '.git','desktop.ini'
Remove-Item -Path $INTERMEDIATE -Recurse -Force