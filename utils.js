const _ = require('lodash')
function convert(filter) {
    const topics =filter.topics ? new Array(filter.topics.length).fill(null).map((t,i)=>{
      return filter.topics[i] ?? t
    }) : []
    let result = {
      ...topics,
    }
    if(filter.address!=null){
      result['address'] = filter.address
    }
    if (filter.fromBlock != null) {
      result['fromBlock'] = filter.fromBlock
    }
    if (filter.fromBlock != null) {
      result['toBlock'] = filter.toBlock
    }
    return result
  }
  
function split(filter) {
    for (const key of Object.keys(filter)) {
      const values = _.get(filter, key)
      if (_.isArray(values)) {
        return _.flatten(
          values.map((value) => {
            const f = JSON.parse(JSON.stringify(filter))
            _.set(f, key, value)
            return split(f)
          })
        )
      }
    }
    return filter
  }
  
function explode(s) {
    let topics = { ...s };
    delete topics['address'];
    delete topics['fromBlock'];
    delete topics['toBlock'];
    topics = Object.values(topics);
    let filter = {};
    if (s['address'] != null) {
        filter['address'] = s['address'];
    }
    if (topics.length) {
        filter['topics'] = topics;
    }
    if (s['fromBlock'] != null) {
        filter['fromBlock'] = s['fromBlock'];
    }
    if (s['toBlock'] != null) {
        filter['toBlock'] = s['toBlock'];
    }

    return filter;
  }
  function compareLog(a, b) {
    if (a.blockNumber < b.blockNumber) {
        return -2
    } else if (a.blockNumber > b.blockNumber) {
        return 2
    }
    if (a.logIndex < b.logIndex) {
        return -1
    } else if (a.logIndex > b.logIndex) {
        return 1
    }
    return 0
}
  function mergeTwoUniqSortedLogs(a, b) {
    if (!a?.length) {
        return b ?? []
    }
    if (!b?.length) {
        return a ?? []
    }
    const r = []
    const i = {
        a: 0,
        b: 0
    }
    while (i.a < a.length || i.b < b.length) {
        if (a[i.a] == null) {
            r.push(b[i.b++])
            continue
        }
        if (b[i.b] == null) {
            r.push(a[i.a++])
            continue
        }
        const c = compareLog(a[i.a], b[i.b])
        if (c < 0) {
            r.push(a[i.a++])
            continue
        }
        if (c == 0) {
            i.a++
        }
        r.push(b[i.b++])
    }
    return r;
}
/**
 * Generate a valid filter list with scan api. The sum of the logs of the filters is equal to the logs of the filter
 * @param {*} filter 
 * @returns
 */
const translateFilter = (filter)=>{
    let filters = split(convert(filter));
    if (Array.isArray(filters)) {
      filters = filters.map((e) => explode(e));
    } else {
      filters = [explode(filters)];
    }
    return filters
}
module.exports = {
    convert,
    split,
    explode,
    mergeTwoUniqSortedLogs,
    translateFilter
}
