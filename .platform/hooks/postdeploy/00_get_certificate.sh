#!/usr/bin/env bash
# Place in .platform/hooks/postdeploy directory
sudo certbot -n -d myturtleproj.is404.net --nginx --agree-tos --email ejpratt7@byu.edu
