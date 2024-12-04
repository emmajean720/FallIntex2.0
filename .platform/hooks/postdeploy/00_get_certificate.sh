#!/usr/bin/env bash
# Place in .platform/hooks/postdeploy directory
sudo certbot -n -d  --nginx --agree-tos --email ejpratt7@byu.edu
