# APIs

## new AssistedJsonRpcProvider()

```js
const { AssistedJsonRpcProvider } = require('assisted-json-rpc-provider')

// Input
//  * provider {ethers.Provider}
//  * config {Object}
//  * config.url {string}. Scan api-endpoints. Default: "https://api.etherscan.io/api"
//  * config.maxResults {Number}. Maximum number of Logs returned from that Log API. Default: 1000
//  * config.rangeThreshold {number}. Threshold range to know whether to use Log API or ethers.provider's getLogs. Default: 5000. 
//  * config.rateLimitCount and config.rateLimitDuration {number}. Default: Rate-limit's Log API is 1 calls/5second
//  * config.apiKeys {string[]}. Using api-key to improve rate-limit
//
//  * return the customized ethers.Provider for getLogs with massive ranges

const provider = new AssistedJsonRpcProvider(
    provider,
    {
        url: 'https://api.bscscan.com/api',
        maxResults: 1000,
        rangeThreshold: 1000,
        rateLimitCount: 1,
        rateLimitDuration: 5000,
    }
)
```