+++
title = 'How to set up your personal server for projects'
date = '2024-10-27T07:54:24-06:00'
description = "How to set up a server for personal web projects."
tags = []
categories = ["DevOps"]
link = ""
hasequations = false
includes = ["https://unpkg.com/mermaid@8.2.3/dist/mermaid.min.js"]       # any javascript files to include
tableofcontents = false
draft = false
+++

I have often been stumped at one stage of personal software projects: sharing with others. It one of two ways:

I come up with a fun idea and make a prototype. The repo is up on github. Anyone who wants to use it will clone it, recreate the environment, and execute on their machine. Many times the work to set up the project demo is not worth the utility of the actual demo.

Or, I am setting up a closed-source project, but would love user feedback.

Or, it's a project for myself that I'd like to host publicly (see [here how I wrote a script to get into tennis meetups](./chatgpt-tennis-project/index.md)).

In all of the above cases, uploading to a repository host (Github), or some static website builder (vercel, cloudfare, github) is insufficient. Previously, I'd exposed my home server to host projects ([see here how I SSH to my desktop remotely](./Remote%20SSH%20into%20desktop.md)). Server availability in that case is subject to power outages, networking restrictions, and foremost - security.

Now, I've taken to using virtual private servers to host some projects. This is how it works:

1. I get a Virtual Private Server (VPS) (think Google Cloud free tier e2-micro instance, Digital Ocean droplet etc.)
2. I set up a dynamic DNS service to the server is accessible via a domain name.
3. I set up a Caddy server reverse proxy, which comes with built-in TLS security.
4. I deploy my projects as usual on localhost, and tell Caddy to proxy them. This works with docker containers, streamlit apps, simple django/flask apps, and static pages.

If you want to follow along, you should know how to get a VPS and log into it.

<pre class="mermaid">
graph TD;

U[User]
C[Caddy Server]
D[Docker Container]
F[Flask App]
S[Streamlit App]
P[Static Page]

U --> C
C --> D
C --> F
C --> S
C --> P
</pre>

## Dynamic DNS

Use either of the following. Neither requires a payment.

### NoIP

Use this to get a hostname which will dynamically updated with your server's IP address. You can pay to set this up with a custom hostname.

* Use noip.com to get a dynamic dns hostname,
* [Install ddns client on linux machine](https://www.noip.com/support/knowledgebase/installing-the-linux-dynamic-update-client-on-ubuntu/)

```
cd /usr/local/src/
curl -O http://www.noip.com/client/linux/noip-duc-linux.tar.gz
tar xf noip-duc-linux.tar.gz
cd noip-2.1.9-1/
make install
```

* Then run the `noip2` exe in the `/usr/local/bin/noip2 -C` to set up config. Finally run `/usr/local/bin/noip2` to start updating.
* To set this up to start at boot, create a [service like so](https://github.com/jeroendoggen/scripts-tools-misc/commit/654f11afe3a5fa2609c5357881ae4338be71740c).

### ddclient (preferred)

Use [ddclient](https://ddclient.net/) if you have a hostname already, and want to update its DNS records. It supports [dozens of dynamic DNS services](https://ddclient.net/protocols.html)

Install ddclient using `sudo apt-get install ddclient` (debian/ubuntu). The docs walk through setting up a configuration file which you can leave alone after the first time.


## Reverse Proxy

Install [Caddy](https://caddyserver.com/). The docs walk through setting up a configuration file. An example configuration `Caddyfile` may look like this:

```
HOSTNAME {
    redir /app1 /app1/
    handle_path /app1/* {
        reverse_proxy localhost:8080
    }
    redir /app2 /app2/
    handle_path /app2/* {
        reverse_proxy localhost:1234
    }
}
```

This forwards all requests to `HOSTNAME/app1` to whatever is running on `localhost:8080`, and `HOSTNAME/app2` to whatever is running on `localhost:1234`. See [Caddy Examples](https://caddyexamples.com/) for more usage patterns.
