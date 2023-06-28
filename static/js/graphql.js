import { createProgressGraph, createXpByProjectGraph } from "./graphs.js"

const loadUserProfile = async() => {
    const userToken = sessionStorage.getItem("currentSession")
    if(userToken) {
        document.getElementById("logoutBtn").addEventListener("click", () => {
            sessionStorage.removeItem("currentSession")
            window.location.href = "/"
        })

        const userData = await getUserData(userToken)
        const xpByProject = await getXpByProject(userToken)
        const userProgress = await getUserProgress(userToken)

        createUserData(userData)
        createProgressGraph(userProgress, userData.totalXp)
        createXpByProjectGraph(xpByProject)

        document.body.style.visibility = "visible"
    } else {
        window.location.href = "/"
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
            attrs
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
        attrs: results.data.user[0].attrs,
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

// function used to send graphql queries
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

const createUserData = (data) => {
    document.getElementById("username").textContent = data.username
    document.getElementById("firstName").textContent = data.firstName
    document.getElementById("lastName").textContent = data.lastName
    document.getElementById("location").textContent = `${data.attrs.addressCity}, ${data.attrs.addressCountry}`
    document.getElementById("age").textContent = `${calculateAge(data.attrs.dateOfBirth)} years old`

    document.getElementById("xp").textContent = data.totalXp < 1000000 ? formatNumberWithThreeDecimals(data.totalXp/1000) + " kB" : formatNumberWithThreeDecimals((data.totalXp/1000000)) + " MB"

    document.getElementById("auditRatio").textContent = formatNumberWithThreeDecimals(data.auditRatio)
    document.getElementById("auditsDone").textContent = data.auditXpDone < 1000000 ? formatNumberWithThreeDecimals(data.auditXpDone/1000) + " kB" : formatNumberWithThreeDecimals((data.auditXpDone/1000000)) + " MB"
    document.getElementById("auditsReceived").textContent = data.auditXpReceived < 1000000 ? formatNumberWithThreeDecimals(data.auditXpReceived/1000) + " kB" : formatNumberWithThreeDecimals((data.auditXpReceived/1000000)) + " MB"
}

const calculateAge = (dateOfBirth) => {
    const dob = new Date(dateOfBirth)
    const currentDate = new Date()
  
    let age = currentDate.getFullYear() - dob.getFullYear()
  
    if (
        currentDate.getMonth() < dob.getMonth() ||
        (currentDate.getMonth() === dob.getMonth() &&
        currentDate.getDate() < dob.getDate())
    ) {
        age--
    }
  
    return age
}

const formatNumberWithThreeDecimals = (number) => {
    const roundedNumber = Number(number.toFixed(3));
    return roundedNumber % 1 === 0 ? roundedNumber.toFixed(0) : roundedNumber.toString();
}
  
window.onload = loadUserProfile