/**
 * node 爬虫
 */
const fs = require('fs')
const puppeteer = require('puppeteer');
const path = require("path");
const {Parser} = require('json2csv');

const iconv = require('iconv-lite');
const BASE_URL = 'https://www.airbnb.cn'
const CITY_NAME = '东京'; //搜索名称
const fields = ['img', 'des', 'price'];
const opts = { fields };
(async () => {
    // 创建一个浏览器实例
    const browser = await (puppeteer.launch({
        //设置超时时间
        timeout: 50000,
        //如果是访问https页面 此属性会忽略https错误
        ignoreHTTPSErrors: true,
        // 打开开发者工具, 当此值为true时, headless总为false
        devtools: false,
        // 关闭headless模式, 不会打开浏览器
        headless: false,
        // 设置默认窗口大小
        defaultViewport: {
            width: 1366,
            height: 768
        }
    }));
    const newList = []
    // 新开一个页面实例
    const page = await browser.newPage();
    page.once('load', async () => {
        
        console.log('页面加载完成')
        await page.focus('#Koan-via-HeaderController__input')
        
        await page.keyboard.type(CITY_NAME,{delay:100})
        console.log('地点输入完毕')
        await page.keyboard.down('Enter');
        await page.keyboard.up('Enter',);
        await page.waitForTimeout(5000)
        let allTopic = await getAllTopic(page)
        
    })
    // 进入页面
    await page.goto(BASE_URL,{
        waitUntil: 'load', // Remove the timeout
        timeout: 0
    });
})();
// 获取所有话题数据
const getAllTopic = async (page) => {
    console.log('开始爬数据');
    // 爬取总列表
    let titleList = []
    // 总页数
    let pageCount = 1

    // 读取该页获信息
    // 第一页直接读取
    titleList = await getNowPageTopic(page, titleList,pageCount)

    // 下一页按钮
    let nextBtn = await page.$('._i66xk8d ._1c5c8zn')
    // let nextBtnClass = await page.$eval('._1c5c8zn', btn => btn.className.split(' '))

    // 如果下一页还可以按的话就按下一页
    while (nextBtn) {
        await nextBtn.click()
        await page.waitForSelector('._1kss53yu ._o7ccr8')
        await page.waitForTimeout(5000)
        pageCount++
        titleList = await getNowPageTopic(page, titleList,pageCount)
        
        nextBtn = await page.$('._i66xk8d ._1c5c8zn')
    }

    // 将写入文件
    console.log('生成json')
    fs.writeFile(path.relative(__dirname,`${CITY_NAME}.json`) , JSON.stringify(titleList), function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
    //json2csv
    console.log('生成csv')
    const parser = new Parser(opts)
    const csv= parser.parse(titleList)
    var newCsv = iconv.encode(csv, 'GBK')
    fs.writeFile(path.relative(__dirname,`${CITY_NAME}.csv`), newCsv, function(err) {
        if(err) {
            return console.log(err);
        }
        
        console.log("The file was saved!");
    })
    // fs.writeFileSync('titleList.json', JSON.stringify(titleList))
    console.log(`爬取完成，总共${pageCount}页！共有数据${titleList.length}条！`)

    // 返回数据
    return {
        topicList: titleList,
        totalPage: pageCount,
        totalPost: titleList.length
    }
}
// 爬取当页所有标题
const getNowPageTopic = async (page, list,index) => {
    // 公共主题
    console.log(`正在爬${index}页数据`)
    let txt = await page.$$eval('._fhph4u ._8ssblpx', list => {
        return list.map(one => {
            const img = one.querySelector('._9ofhsl')
            const des = one.querySelector('._qrfr9x5')
            const price = one.querySelectorAll('._1ixtnfc span')[1]
            return {
                img: img.src, // 主题标题
                des:des.innerText,
                price:price.innerText
            }
        })
    });

    return list.concat(txt)
}