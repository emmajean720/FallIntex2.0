#!/usr/bin/env bash
# Place in .platform/hooks/postdeploy directory
sudo certbot -n -d myturtleshellproject.is404.net --nginx --agree-tos --email ejpratt7@byu.edu
