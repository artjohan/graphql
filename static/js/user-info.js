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
    // Step 1: Determine the earliest and current dates
    const dates = transactions.map(transaction => new Date(transaction.createdAt));
    const earliestDate = new Date(Math.min(...dates));
    const currentDate = new Date();

    // Step 2: Calculate the x and y coordinates
    const graphWidth = 600; // Adjust as needed
    const graphHeight = 600; // Adjust as needed
    const xScale = graphWidth / (currentDate - earliestDate);

    totalXp /= 1000
    const graphData = transactions.map(transaction => {
      totalXp -= transaction.amount/1000;
      return {
        x: (new Date(transaction.createdAt) - earliestDate) * xScale,
        y: totalXp,
      };
    });

    console.log(graphData)

    // Step 3: Create the SVG elements
    const svgElements = graphData.map((data, index) => {
      const circle = `<circle cx="${data.x}" cy="${data.y}" r="3" fill="blue" />`;

      const line = index > 0 ? `<line x1="${graphData[index - 1].x}" y1="${graphData[index - 1].y}" x2="${data.x}" y2="${data.y}" stroke="blue" />` : '';

      return circle + line;
    });

    const svgGraph = `
      <svg width="${graphWidth}" height="${graphHeight}" xmlns="http://www.w3.org/2000/svg">
        ${svgElements.join('')}
      </svg>
    `;

    document.getElementById('graphContainer').innerHTML = svgGraph;
}

window.onload = loadUserProfile