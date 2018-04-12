# citrix-keepalive
A script that resolves my annoyance against the default Citrix server timeout configuration

## Problem

The Citrix server I am working with is configured to kill Citrix sessions if there is **5 minutes of inactivity**. So I wrote this script to simulate mouse clicks periodically to keep the session alive.

## To run

The script is tested under
 - Arch Linux
 - NodeJS 9

Things to install
 - NodeJS
 - xdotool

To run

```
 yarn install
 sudo DEBUG=error node run.js
```

To debug
```
sudo DEBUG=* node run.js
