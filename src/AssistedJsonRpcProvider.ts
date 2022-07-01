import { mergeTwoUniqSortedLogs, translateFilter } from './utils'
import _ from 'lodash'
import AsyncTaskThrottle from "async-task-throttle-on-response"
import { providers, utils } from 'ethers';
import standardizeStartConfiguration from './validator';
import { Log } from './types'

// const DefaultAPIKey = 'YD1424ACBTAZBRJWEIHAPHFZMT69MZXBBI'
class AssistedJsonRpcProvider extends providers.JsonRpcProvider {
    provider: providers.JsonRpcProvider
    etherscanConfig: any
    queues: any[]
    constructor(
        provider: providers.JsonRpcProvider,
        etherscanConfig = {
            rangeThreshold: 5000,
            rateLimitCount: 1,
            rateLimitDuration: 5000,
            url: 'https://api.etherscan.io/api',
            maxResults: 1000,
            apiKeys: [] as string[],
            fetch: async (_: string) => []
        }
    ) {
        super(provider.connection.url);
        this.provider = provider;
        let validConfig = standardizeStartConfiguration(etherscanConfig)
        if (!validConfig.apiKeys?.length) {
            validConfig.apiKeys = ['YourApiKeyToken'] // dummy key which is accepted by etherscan as no key
        }
        this.etherscanConfig = validConfig;
        this.queues = this.etherscanConfig.apiKeys.map((apiKey: string) => {
            const queue: any = AsyncTaskThrottle.create(this.etherscanConfig.fetch, validConfig.rateLimitCount, validConfig.rateLimitDuration)
            queue.apiKey = apiKey
            return queue
        })
    }
    // Override
    async getLogs(filter: any): Promise<Log[]> {
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
    async getLogsDefault(filter: any): Promise<Log[]> {
        return this.provider.getLogs(filter);
    }
    async getLogsByApi(filter: any): Promise<Log[]> {
        let filters = translateFilter(filter);

        const logss: Log[][] = await Promise.all(filters.map((filter: any) => this.scanLogs(filter)))

        const all = logss.reduce((result, logs) => {
            return mergeTwoUniqSortedLogs(result, logs)
        }, [])

        return all;
    }
    index = 0
    getQueue() {
        this.index = (this.index < this.queues.length - 1) ? (this.index + 1) : 0
        return this.queues[this.index]
    }
    async search(url: string) {
        try {
            while (true) {
                const queue = this.getQueue()
                const urlApiKey = url + `&apikey=${queue.apiKey}`

                const res = await queue(urlApiKey).then((data: any) => data);

                if (Array.isArray(res.result)) {
                    res.result.forEach((log: any) => {
                        log.address = utils.getAddress(log.address)
                        log.blockNumber = Number(log.blockNumber) || 0
                        log.transactionIndex = Number(log.transactionIndex) || 0
                        log.logIndex = Number(log.logIndex) || 0
                    })
                    return res.result;
                }
            }
        } catch (error) {
            throw error;
        }
    }
    async scanLogs(filter: any) {
        let result: Log[] = [];
        let fromBlock = filter.fromBlock;
        while (true) {
            const url = this.getUrlScanLog({
                ...filter,
                fromBlock,
            });

            let logs: Log[] = await this.search(url);

            if (logs.length < this.etherscanConfig.maxResults) {
                return result.concat(logs);
            }
            let maxLog = _.maxBy(logs, 'blockNumber')
            if (maxLog == null) return result // case: Logs = []

            fromBlock = Number(maxLog.blockNumber);
            // Truncate forward 1 block
            logs = logs.filter((log: Log) => Number(log.blockNumber) < fromBlock)

            result = result.concat(logs);
        }
    }
    getUrlScanLog(filter: any) {
        let url = this.etherscanConfig.url + '?module=logs&action=getLogs';
        for (const key in filter) {
            if (Object.prototype.hasOwnProperty.call(filter, key)) {
                const value = filter[key];
                if (key == 'topics') {
                    value.forEach((topic: any, index: any) => {
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

export default AssistedJsonRpcProvider;