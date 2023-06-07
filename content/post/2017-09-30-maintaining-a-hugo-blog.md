+++
title = "Trials and Tribulations of Maintaining a Hugo Blog"
date = "2017-09-30T17:29:58-05:00"
description = ""
tags = ["hugo", "Web development", "Powershell"]
categories = ["DevOps", "Developer"]
series = ["Hugo site development"]
isexternal = false
hasequations = false
hascode = true
+++


As of the writing of this post, I maintain this site using my very own theme created in hugo. [Hugo][1] is a static site generator. It takes a bunch of plain text, applies a theme, and renders it as HTML. This is opposed to applications like Wordpress that assemble a page each time its served, to put it simply. This *compute once, use many times* approach saves on processing time and makes a site more portable. Case in point: this site is hosted on [GitHub][2], but I can easily move it to any hosting service.

When I first started out, the entire site - the source and the rendered HTML were stored in the same directory in the same git branch. My file structure was something like this:

```
MySite
    |-src\
    |   |-content\
    |   |-static\
    |   |-themes\
    |   |-config.toml
    |-All
    |-of
    |-the
    |-rendered
    |-files
    |-like
    |-index.html
```

Whenever I made an edit to the site source that I wanted to deploy, I'd first manually delete all the folders in my root excepting `src` and then run the command:

```Powershell
hugo -d ../
```

Which told `hugo` to take everything in my source folder and render it as a static site in my root folder. Mind you, this convuluted arrangement wasn't simply ignorance. It was that too, but I had to have my rendered site in the root folder of my repository for GitHub to properly serve it.

This also meant that many changes that did not make it all the way to deployment polluted my commit history. This was too messy.

### ...evolution

The next step was to divide the source and HTML between two branches. I could then tinker with my site to my heart's content. And only changes that satisfied me would be committed to the master branch.

```
>>> BRANCH SRC
MySite
    |-content\
    |-static\
    |-themes\
    |-config.toml

>>> BRANCH MASTER
MySite
    |-All
    |-of
    |-the
    |-rendered
    |-files
    |-like
    |-index.html
```

I would render my site into an intermediate folder, switch branches, copy over the files and commit changes:

```Powershell
hugo -d ../intermediate/ -cleanDestinationDir
# add and commit changes to src branch
# switch to master branch and copy over the results
Move-Items ../Intermediate/* ./ -Recurse -Force
# add and commit changes to master branch
```

This was much better. I was isolating different aspects of my project. However it was still complicated. I couldn't view my source and rendered HTML at the same time as git would switch branches in the same folder. I was dissatisfied by the frequent overwrite operations incurred by switching branches. Something had to be done. Man's pursuit of terminal laziness lends him to amazing feats of industry. And so I set about finding a way to further reduce my work load.

### ...enter git worktree

[`worktree`][3] is a git feature that lets you have different branches checked out at the *same* time in different directories. So I could have my source and master branch folders side-by-side and switch between them without one overwriting the other.

From my master branch, I checked out my `src` branch into another folder:

```powershell
git worktree add ../blogsource src
```

Now, my files looked like:

```
blogsource              <- source and HTML existing in harmony...
    |-content\
    |-static\
    |-themes\
    |-config.toml

MySite                  <- ...like yin and yang
    |-All
    |-of
    |-the
    |-rendered
    |-files
    |-like
    |-index.html
```

### ...industrial revolution!

Finally, it was time to automate my workflow. I wanted to render my source into an intermediate folder, copy over the contents to my master branch folder, and clean up the mess. Here my ephemeral flirtations with Powershell paid off.

```powershell
# Runs hugo in source dir and overwrites previous build in destination folder.
# Overwrites files in destination folder but does not delete other files.
# Run this from the source folder.

$SRC = './'                     # path to source
$INTERMEDIATE = './public'      # intermediate directory
$DEST = '../hazrmard.github.io' # master branch path

# create intermediate or clean it
If(!(test-path $INTERMEDIATE))
{
    New-Item -ItemType Directory -Force -Path $INTERMEDIATE
} else {
    Remove-Item -Path "$INTERMEDIATE/*" -Recurse -Force
}

& hugo.exe -s $SRC -d $INTERMEDIATE | Out-Null  # render site

# Copy over and clean up
Copy-Item -Path "$INTERMEDIATE/*" -Destination $DEST -Force -Recurse
Remove-Item -Path $INTERMEDIATE -Recurse -Force
```

### Continuous deployment and GitHub Actions

The problem with this approach was that I had to manually run the script and commit changes every time I wanted to deploy new content. This added friction to my workflow.

Github Actions were a lifesaver. I set up an existing workflow. First I changed my repository's build and deployment source from Github pages - where it serves static content from a specified branch - to Github Actions, where I could set the script to build the static assets to be deployed.

Using the Hugo pages workflow, and setting the `source` branch as the source of truth, I was able to make Github make the site for me at each commit. I work on my drafts on the `drafts` branch. When I am ready to make changes, I simply push thte commit upstream to the `source` to let Github know I am ready for the goodies.

```powershell
git push origin drafts:source
```

### Conclusion

In my current workflow, I have two separate directories for my master and source branches, thanks to [`worktree`][3]. And I use my deployment script to quickly render and copy files between branches.

The time is not far when I'll just dream new blog posts into existence.

[1]: https://gohugo.io
[2]: https://github.com/hazrmard/hazrmard.github.io
[3]: https://git-scm.com/docs/git-worktree