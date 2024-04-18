import fs from 'fs'
import { fetchGA4Data, convertAndMerge, saveGA4Data } from '../lib/ga4.js'

const main = async () => {
  const startDate = '2021-11-15'
  const endDate = '2023-11-14'
  const dataPath = `/tmp/lambda-handlers-sync-ga4-data(${startDate}-${endDate}).json`
  let data
  if (fs.existsSync(dataPath)) {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  } else {
    data = await fetchGA4Data({ startDate, endDate })
    fs.writeFileSync(dataPath, JSON.stringify(data))
  }
  const convertedPath = `/tmp/lambda-handlers-sync-ga4-data-converted(${startDate}-${endDate}).json`
  let convertedData
  if (fs.existsSync(convertedPath)) {
    convertedData = JSON.parse(fs.readFileSync(convertedPath, 'utf-8'))
  } else {
    convertedData = await convertAndMerge(data)
    fs.writeFileSync(convertedPath, JSON.stringify(convertedData))
  }
  await saveGA4Data(convertedData, { startDate, endDate })
}

main()
