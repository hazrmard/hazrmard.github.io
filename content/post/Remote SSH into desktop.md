+++
title = 'Remote SSH into your home desktop'
date = '2023-06-07T09:22:00-05:00'
description = ""
tags = []
categories = ["DevOps"]
link = ""
hasequations = false
includes = []       # any javascript files to include
tableofcontents = false
draft = false
+++

Things you'll need:

1. A dynamic DNS service
2. A router
3. A local desktop
4. A remote computer

Audience for this post: people who have used SSH before.

Often times I have found myself wanting to access a computer at home while I am traveling. There are options like TeamViewer, which let me control my computer's screen from afar. But, I want something more convenient over the command line, like SSH. That way I can drop in and out of my home machine without breaking my flow.

The problem is that internet service providers (ISPs) do not usually assign static IP addresses to their customers' routers. I need to know my router's IP before I can SSH into it.

Enter, dynamic DNS (DDNS) services like [NoIP](https://NoIP.com). They do IP address tracking for you. All you need is this:

1. create an account with them,
2. get a domain name, like `somethingmine.ddns.net`
3. run a provided application that will periodically report the IP address of the machine it is running on,
4. use the domain name to ssh into your machine

Some routers, like mine, have built-in support for DDNS, so you do not need to run any new application.

## Security

Exposing your home computer carries safety risks. There are several mitigation measures:

1. [Disable password logins](https://stackoverflow.com/a/20898942/4591810). [Use private keys instead](https://www.digitalocean.com/community/tutorials/how-to-configure-ssh-key-based-authentication-on-a-linux-server).
2. Do not use the default port 22 for SSH logins. Instead have the router forward another port to the port 22 of your local machine.
3. Use applications like [fail2ban](https://github.com/fail2ban/fail2ban) to block IPs making spurious login attempts.
4. Instead of directly logging into your desktop, log into a gateway machine like a Raspberry Pi. Then log into your desktop. You can do this manually, or use ssh [`ProxyCommand`/`ProxyJump`](https://goteleport.com/blog/ssh-proxyjump-ssh-proxycommand/)

## Helpful tips

[SSH setup on windows](https://github.com/PowerShell/Win32-OpenSSH/wiki).
To make the SSH server start on login, make it a service:

```powershell
Set-Service -Name sshd -StartupType 'Automatic'
```

The location of ssh server configuration files is `/etc/ssh/sshd_config` on Linux, and `$env:PROGRAMDATA\ssh\sshd_config` on Windows.

Add your public keys to `~/.ssh/authorized_keys`.  Also, on Windows, users with admin priveliges are added to `$env:PROGRAMDATA\ssh\administrators_authorized_keys`

Make an `~/.ssh/config` file, so you can log in like `ssh desktop` instead of `ssh user@host:port -option -option`. Ugh! Like so:

```bash
Host desktop
    HostName SOMETHINGMINE.ddns.net
    User USERNAME
    # Password-less login using private keys:
    IdentityFile ~/.ssh/id_rsa
    # Smaller SSH packets, but more processing to de/compress
    Compression yes
    # a random port number which your router will forward
    # to your local machine:
    Port 1776
```

So now, when I `ssh desktop`, I will connect to `SOMETHINGMINE.ddns.net`, which will point to the last recorded IP of my router. My ssh client will look at port 1776, which the router will forward to port 22 of my desktop's local IP address.

## Remote into WSL over SSH

As of this writing, WSL won't start over SSH. However, the following config can get around the limitations. First, update WSL on the host machine `wsl --update`. Then add the config entry:

```bash
Host desktop-wsl
    HostName SOMETHINGMINE.ddns.net
    User USERNAME
    IdentityFile ~/.ssh/id_rsa
    Compression yes
    Port 1776
    # After logging into windows host, start WSL session:
    RequestTTY force
    RemoteCommand & 'C:\Program Files\WSL\wsl.exe' ~
```
