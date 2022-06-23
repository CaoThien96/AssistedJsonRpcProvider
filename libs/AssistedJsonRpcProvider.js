const { mergeTwoUniqSortedLogs, translateFilter } = require('../utils');
const fetch = require('node-fetch');
const _ = require('lodash');
const ethers = require('ethers');
const AsyncTaskThrottle = require('async-task-throttle-on-response').default
const { Provider } = require('@ethersproject/providers');
const { standardizeStartConfiguration } = require('./validator');

// const DefaultAPIKey = 'YD1424ACBTAZBRJWEIHAPHFZMT69MZXBBI'
class AssistedJsonRpcProvider extends Provider {
    constructor(
        provider,
        etherscanConfig = {
            rangeThreshold: 5000,
            rateLimitCount: 1,
            rateLimitDuration: 5000,
            url: 'https://api.etherscan.io/api',
            maxResults: 1000,
            apiKeys: [],
        }
    ) {
        super();
        this.provider = provider;
        let validConfig = standardizeStartConfiguration(etherscanConfig)
        if (!validConfig.apiKeys?.length) {
            validConfig.apiKeys = ['YourApiKeyToken'] // dummy key which is accepted by etherscan as no key
        }
        this.etherscanConfig = validConfig;
        this.queues = this.etherscanConfig.apiKeys.map((apiKey) => {
            const queue = AsyncTaskThrottle.create(fetch, validConfig.rateLimitCount, validConfig.rateLimitDuration)
            queue.apiKey = apiKey
            return queue
        })
    }
    // Queries
    getBalance(...args) {
        return this.provider.getBalance(...args);
    }
    getBlock(...args) {
        return this.provider.getBlock(...args);
    }
    getBlockNumber(...args) {
        return this.provider.getBlockNumber(...args);
    }
    getBlockWithTransactions(...args) {
        return this.provider.getBlockWithTransactions(...args);
    }
    getCode(...args) {
        return this.provider.getCode(...args);
    }
    getFeeData(...args) {
        return this.provider.getFeeData(...args);
    }
    getGasPrice(...args) {
        return this.provider.getGasPrice(...args);
    }
    getNetwork(...args) {
        return this.provider.getNetwork(...args);
    }
    getStorageAt(...args) {
        return this.provider.getStorageAt(...args);
    }
    getTransaction(...args) {
        return this.provider.getTransaction(...args);
    }
    getTransactionReceipt(...args) {
        return this.provider.getTransactionReceipt(...args);
    }
    getTransactionCount(...args) {
        return this.provider.getTransactionCount(...args);
    }
    // Execution
    sendTransaction(...args) {
        return this.provider.sendTransaction(...args);
    }
    call(...args) {
        return this.provider.call(...args);
    }
    estimateGas() {
        return this.provider.estimateGas(...args);
    }
    // ENS
    resolveName(...args) {
        return this.provider.resolveName(...args)
    };
    lookupAddress(...args) {
        return this.provider.lookupAddress(...args)
    };
    // Event Emitter (ish)
    on(...args) {
        return this.provider.on(...args)
    };
    once(...args) {
        return this.provider.once(...args)
    }
    emit(...args) {
        return this.provider.emit(...args)
    }
    listenerCount(...args) {
        return this.provider.listenerCount(...args)
    }
    listeners(...args) {
        return this.provider.listeners(...args)
    };
    off(...args) {
        return this.provider.off(...args)
    };
    removeAllListeners(...args) {
        return this.provider.removeAllListeners(...args)
    };

    waitForTransaction(...args) {
        return this.provider.waitForTransaction(...args)
    }
    // Override
    async getLogs(filter) {
        if (
            this.etherscanConfig &&
            filter.fromBlock != null &&
            filter.toBlock != null &&
            filter.toBlock - filter.fromBlock >
            this.etherscanConfig.rangeThreshold
        ) {
            return this.getLogsByApi(filter);
        } else {
            return this.getLogsDefault(filter);
        }
    }
    async getLogsDefault(filter) {
        return this.provider.getLogs(filter);
    }
    async getLogsByApi(filter) {
        let filters = translateFilter(filter);

        const logss = await Promise.all(filters.map(filter => this.scanLogs(filter)))

        logss.forEach(
            (logs) => {
                logs.forEach(log => {
                    log.address = ethers.utils.getAddress(log.address)
                    log.blockNumber = Number(log.blockNumber) || 0
                    log.logIndex = Number(log.logIndex) || 0
                })

            }
        );

        const all = logss.reduce((result, logs) => {
            return mergeTwoUniqSortedLogs(result, logs)
        }, [])

        return all;
    }
    getQueue() {
        this.index = (this.index < this.queues.length - 1) ? (this.index + 1) : 0
        return this.queues[this.index]
    }
    async search(url) {
        try {
            while (true) {
                const queue = this.getQueue()
                const urlApiKey = url + `&apikey=${queue.apiKey}`

                const res = await queue(urlApiKey).then((res) => res.json());

                if (Array.isArray(res.result)) {
                    return res.result;
                }
            }
        } catch (error) {
            throw error;
        }
    }
    async scanLogs(filter) {
        let result = [];
        let fromBlock = filter.fromBlock;
        while (true) {
            const url = this.getUrlScanLog({
                ...filter,
                fromBlock,
            });

            let logs = await this.search(url);

            if (logs.length < this.etherscanConfig.maxResults) {
                return result.concat(logs);
            }

            fromBlock = Number(_.maxBy(logs, 'blockNumber').blockNumber);

            // Truncate forward 1 block
            logs = logs.filter(log => Number(log.blockNumber) < fromBlock)

            result = result.concat(logs);
        }
    }
    getUrlScanLog(filter) {
        let url = this.etherscanConfig.url + '?module=logs&action=getLogs';
        for (const key in filter) {
            if (Object.prototype.hasOwnProperty.call(filter, key)) {
                const value = filter[key];
                if (key == 'topics') {
                    value.forEach((topic, index) => {
                        url += topic != null ? `&topic${index}=${topic}` : '';
                    });
                } else {
                    url += value != null ? `&${key}=${value}` : '';
                }
            }
        }
        // url+=`&apikey=${DefaultAPIKey}`
        return url;
    }
}

module.exports = AssistedJsonRpcProvider;
