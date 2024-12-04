#!/usr/bin/env bash
# Place in .platform/hooks/postdeploy directory
sudo certbot -n -d myturtlesheltproj.click --nginx --agree-tos --email ejpratt7@byu.edu
