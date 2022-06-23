# Installation

```bash
# STEP 1. 
#
# Make sure that local machine has read permission to Github repository at
# https://github.com/launchzone/AssistedJsonRpcProvider by SSH key. 

# STEP 2.
#
# Install package via SSH.
#   * <tag> Specific tag.
npm install git+ssh://git@github.com:launchzone/AssistedJsonRpcProvider.git#<tag>

# STEP 3.
# 
# Test. 
node -e 'require("assisted-json-rpc-provider")' && echo 'ok'
```
