const loadUserProfile = async() => {
    const userToken = sessionStorage.getItem("currentSession")
    if(userToken) {
        const userData = await getUserData(userToken)
        const xpByProject = await getXpByProject(userToken)
        const userProgress = await getUserProgress(userToken)
        console.log(userData)
        console.log(xpByProject)
        console.log(userProgress)

        createProgressGraph(userProgress, userData.totalXp)
        createXpByProjectGraph(xpByProject)
    }
}

// nested query
const getUserData = async (userToken) => {
    const query = `{
        user {
            login
            firstName
            lastName
            auditRatio
            email
            totalUp
            totalDown
            transactions(
                where: {
                    path: {_regex: "^\\/johvi\\/div-01\\/[-\\\\w]+$"}
                    type: {_eq:"xp"}
                },
            )   {
                    amount
                }
            }
        }
    `
    const queryBody = {
        query
    }

    const results = await getQueryResults(queryBody, userToken)
    const totalXp = results.data.user[0].transactions.reduce((total, transaction) => total + transaction.amount, 0)

    const userData = {
        username: results.data.user[0].login,
        firstName: results.data.user[0].firstName,
        lastName: results.data.user[0].lastName,
        auditRatio: results.data.user[0].auditRatio,
        auditXpDone: results.data.user[0].totalUp,
        auditXpReceived: results.data.user[0].totalDown,
        totalXp
    }
    
    return userData
}

// query using variable
const getXpByProject = async (userToken) => {
    const query = `
        query GetXpByProject($transactionType: String!) {
            transaction(
                where: {
                    path: { _regex: "^\\/johvi\\/div-01\\/[-\\\\w]+$" }
                    type: { _eq: $transactionType }
                },
                order_by: { amount: asc }
            ) {
                amount
                path
            }
        }
    `
  
    const queryBody = {
        query: query,
        variables: {
            transactionType: "xp",
        },
    }

    const results = await getQueryResults(queryBody, userToken)

    const xpByProjectData = results.data.transaction.map((transaction) => {
        const updatedPath = transaction.path.replace("/johvi/div-01/", "")
        return { ...transaction, path: updatedPath}
    })
    return xpByProjectData
}

// normal query
const getUserProgress = async (userToken) => {
    const query = `
        {
            transaction(
                where: {
                    path: { _regex: "^\\/johvi\\/div-01\\/[-\\\\w]+$" }
                    type: { _eq: "xp" }
                },
                order_by: { createdAt: asc }
            ) {
                amount
                createdAt
            }
        }
    `
  
    const queryBody = {
        query: query,
    }

    const results = await getQueryResults(queryBody, userToken)

    return results.data.transaction
}

const getQueryResults = async (queryBody, userToken) => {
    const url = "https://01.kood.tech/api/graphql-engine/v1/graphql"

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + userToken
        },
        body: JSON.stringify(queryBody)
    }
    try {
        const response = await fetch(url, options)
        if(response.ok) {
            const result = await response.json()
            return result
        } else {
            const statusMsg = await response.text()
            return statusMsg
        }
    } catch (error) {
        console.error(error)
    }
}

const createProgressGraph = (transactions, totalXp) => {
    const graphHeightIncrements = roundToNearest25(totalXp / 10000)
  
    const dates = transactions.map(transaction => new Date(transaction.createdAt))
    const earliestDate = new Date(Math.min(...dates))
    earliestDate.setDate(1)

    const currentDate = new Date()
    if (currentDate.getDate() !== 1) {
        currentDate.setMonth(currentDate.getMonth() + 1)
        currentDate.setDate(1)
    }
  
    transactions.unshift({
        amount: 0,
        createdAt: earliestDate,
    })
  
    const graphWidth = 690
    const graphHeight = 366
    const xPadding = 40
    const yPadding = 20
  
    totalXp /= 1000
    const xScale = (graphWidth - xPadding * 2) / (currentDate - earliestDate)
    const yScale = (graphHeight - yPadding * 2) / totalXp
  
    const graphData = transactions.map(transaction => {
      totalXp -= transaction.amount / 1000
      return {
            x: (new Date(transaction.createdAt) - earliestDate) * xScale + xPadding,
            y: graphHeight - (totalXp * yScale + yPadding),
        }
    })
  
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', graphWidth)
    svg.setAttribute('height', graphHeight + yPadding * 2)

    const title = document.createElementNS("http://www.w3.org/2000/svg", "text")
    title.setAttribute("x", "50%")
    title.setAttribute("y", graphHeight+30)
    title.setAttribute("dominant-baseline", "middle")
    title.setAttribute("stroke", "black")
    title.setAttribute("text-anchor", "middle")
    title.setAttribute("transform", `rotate(180 0 ${graphHeight+30}) scale(-1, 1)`)
    title.textContent = "User progression over time"

    svg.appendChild(title)

    const backgroundLineHorizontalDistance = graphHeight / (graphHeightIncrements * yScale)
    const backgroundLineHorizontalIncrement = graphHeight / backgroundLineHorizontalDistance
  
    for (let i = 0; i < backgroundLineHorizontalDistance; i++) {
        const y = i * backgroundLineHorizontalIncrement + yPadding
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        line.setAttribute('x1', xPadding)
        line.setAttribute('y1', y)
        line.setAttribute('x2', graphWidth - xPadding)
        line.setAttribute('y2', y)
        line.setAttribute('stroke', 'lightgray')
        line.setAttribute('stroke-dasharray', '2')
        svg.appendChild(line)
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', 0)
        text.setAttribute('y', y)
        text.setAttribute('fill', 'black')
        text.setAttribute('font-size', '12')
        text.setAttribute('transform', `rotate(180 0 ${y}) scale(-1, 1)`)
        text.textContent = i * graphHeightIncrements
        svg.appendChild(text)
    }
  
    const monthMap = new Map([
        [0, 'Jan'],
        [1, 'Feb'],
        [2, 'Mar'],
        [3, 'Apr'],
        [4, 'May'],
        [5, 'Jun'],
        [6, 'Jul'],
        [7, 'Aug'],
        [8, 'Sep'],
        [9, 'Oct'],
        [10, 'Nov'],
        [11, 'Dec'],
    ])
  
    let bigTimeInterval = false
    let monthsDifference = calculateMonthsDifference(earliestDate, currentDate)
  
    if (monthsDifference >= 12) {
        bigTimeInterval = true
        for (let i = monthsDifference; i % 3 !== 0; i++) {
            currentDate.setMonth(currentDate.getMonth() + 1)
            monthsDifference++
        }
        monthsDifference /= 3
    }
  
    const backgroundLineVerticalIncrement = (graphWidth - xPadding * 2) / monthsDifference
    let startMonth = earliestDate.getMonth()
    let startYear = earliestDate.getFullYear().toString().slice(2)
  
    for (let i = 0; i <= monthsDifference; i++) {
        if (startMonth >= 12) {
            startMonth -= 12
            startYear++
        }
        const x = i * backgroundLineVerticalIncrement + xPadding
      
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        line.setAttribute('x1', x)
        line.setAttribute('y1', yPadding)
        line.setAttribute('x2', x)
        line.setAttribute('y2', graphHeight + yPadding)
        line.setAttribute('stroke', 'lightgray')
        line.setAttribute('stroke-dasharray', '2')
        svg.appendChild(line)
      
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', x - 5)
        text.setAttribute('y', 5)
        text.setAttribute('fill', 'black')
        text.setAttribute('font-size', '12')
        text.setAttribute('transform', `rotate(180 0 5) scale(-1, 1)`)
        text.textContent = `${monthMap.get(startMonth)} ${startYear}`
        svg.appendChild(text)
      
        bigTimeInterval ? (startMonth += 3) : startMonth++
    }
  
    for (const data of graphData) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.setAttribute('cx', data.x)
        circle.setAttribute('cy', data.y)
        circle.setAttribute('r', '3')
        circle.setAttribute('fill', 'black')
        svg.appendChild(circle)
    }
  
    for (let i = 1; i < graphData.length; i++) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        line.setAttribute('x1', graphData[i - 1].x)
        line.setAttribute('y1', graphData[i - 1].y)
        line.setAttribute('x2', graphData[i].x)
        line.setAttribute('y2', graphData[i].y)
        line.setAttribute('stroke', 'black')
        svg.appendChild(line)
    }
  
    document.getElementById('progressGraphContainer').innerHTML = ''
    document.getElementById('progressGraphContainer').appendChild(svg)
}

const createXpByProjectGraph = (data) => {
    const barGraph = document.getElementById('barGraph')
    const comparisonChart = document.getElementById('comparisonGraph')

    const barHeight = 30
    const barGap = 15
    const barWidth = 600

    const graphHeight = (barHeight + barGap) * (data.length+1)
    barGraph.setAttribute("height", graphHeight)
  
    const maxValue = Math.max(...data.map(item => item.amount))
    const maxNotchValue = roundToHighest25(maxValue/1000)
    const xRatio = barWidth/(maxValue/1000)
  
    const notchCount = maxValue > 10000 ? 10 : 5
    const xPadding = 10
    const notchWidth = (maxNotchValue * xRatio) / notchCount
    const notchValue = maxNotchValue / notchCount

    const title = document.createElementNS("http://www.w3.org/2000/svg", "text")
    title.setAttribute("x", "50%")
    title.setAttribute("y", 25)
    title.setAttribute("dominant-baseline", "middle")
    title.setAttribute("stroke", "black")
    title.setAttribute("text-anchor", "middle")
    title.textContent = "XP earned by project"
    barGraph.appendChild(title)

    for (let i = 0; i <= notchCount; i++) {
        const notchX = i * notchWidth + xPadding
        
        const notch = document.createElementNS("http://www.w3.org/2000/svg", "line")
        notch.setAttribute("x1", notchX)
        notch.setAttribute("y1", 0)
        notch.setAttribute("x2", notchX)
        notch.setAttribute("y2", 10)
        notch.setAttribute("stroke", "gray")
        
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text")
        label.setAttribute("x", notchX)
        label.setAttribute("y", 25)
        label.setAttribute("text-anchor", "middle")
        label.setAttribute("fill", "black")
        label.textContent = (i * notchValue)
        
        comparisonChart.appendChild(notch)
        comparisonChart.appendChild(label)
    }
  
    data.forEach((item, index) => {
        const barLength = (item.amount / maxValue) * barWidth
  
        const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect")
        bar.setAttribute("x", xPadding)
        bar.setAttribute("y", (index+1) * (barHeight + barGap))
        bar.setAttribute("width", barLength)
        bar.setAttribute("height", barHeight)
        bar.setAttribute("fill", "steelblue")
        
        const pathText = document.createElementNS("http://www.w3.org/2000/svg", "text")
        pathText.setAttribute("x", barWidth)
        pathText.setAttribute("y", ((index+1) * (barHeight + barGap)) + (barHeight / 2))
        pathText.setAttribute("dominant-baseline", "middle")
        pathText.setAttribute("fill", "black")
        pathText.setAttribute("text-anchor", "end")
        pathText.textContent = item.path

        const amountText = document.createElementNS("http://www.w3.org/2000/svg", "text")
        amountText.setAttribute("x", 10)
        amountText.setAttribute("y", ((index+1) * (barHeight + barGap)) + (barHeight / 2))
        amountText.setAttribute("dominant-baseline", "middle")
        amountText.setAttribute("fill", "black")
        amountText.textContent = item.amount/1000 + " kB"

        barGraph.appendChild(bar)
        barGraph.appendChild(pathText)
        barGraph.appendChild(amountText)
    })
}

const roundToNearest25 = (num) => {
    var returnVal = Math.round(num / 25) * 25
    return returnVal ? returnVal : 10
}

const roundToHighest25 = (num) => {
    const rounded = Math.ceil(num / 25) * 25
    return num < 10 ? 10 : rounded
}

const calculateMonthsDifference = (startDateStr, endDateStr) => {
    const startDate = new Date(startDateStr)
    const endDate = new Date(endDateStr)
    
    const startYear = startDate.getFullYear()
    const startMonth = startDate.getMonth()
    const endYear = endDate.getFullYear()
    const endMonth = endDate.getMonth()

    return (endYear - startYear) * 12 + (endMonth - startMonth)
}
  
window.onload = loadUserProfile