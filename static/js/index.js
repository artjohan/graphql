const addLoginFunctionality = () => {
    const userToken = sessionStorage.getItem("currentSession")
    if(userToken) {
        window.location.href = "/graphql"
    } else {
        const loginForm = document.getElementById("loginForm")
        const usernameOrEmail = document.getElementById("usernameOrEmail")
        const password = document.getElementById("password")

        password.addEventListener("input", () => {
            document.getElementById("password-error").innerHTML = ""

            if(password.value && usernameOrEmail.value) {
                document.getElementById("loginBtn").disabled = false
            } else {
                document.getElementById("loginBtn").disabled = true
            }
        })

        usernameOrEmail.addEventListener("input", () => {
            document.getElementById("usernameOrEmail-error").innerHTML = ""
            if(password.value) {
                document.getElementById("password-error").innerHTML = ""
            }

            if(password.value && usernameOrEmail.value) {
                document.getElementById("loginBtn").disabled = false
            } else {
                document.getElementById("loginBtn").disabled = true
            }
        })

        loginForm.addEventListener("submit", (event) => {
            event.preventDefault()

            if(!password.value) {
                document.getElementById("password-error").innerHTML = "Password is required"
            }
            if(!usernameOrEmail.value) {
                document.getElementById("usernameOrEmail-error").innerHTML = "Username or Email is required"
            }

            if(usernameOrEmail.value && password.value) {
                attemptLogin(usernameOrEmail.value, password.value)
            }
        })

        document.body.style.visibility = "visible"
    }
}

const attemptLogin = async (usernameOrEmail, password) => {
    const url = "https://01.kood.tech/api/auth/signin"

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "text/plain",
            "Content-Encoding": "base64",
            "Authorization": "Basic " + btoa(`${usernameOrEmail}:${password}`)
        }
    }
    try {
        const response = await fetch(url, options)
        handleLoginResponse(response)
    } catch (error) {
        console.error(error)
    }
}

const handleLoginResponse = async (response) => {
    if(response.ok) {
        const result = await response.json()
        sessionStorage.setItem("currentSession", result)
        window.location.href = "/graphql" 
    } else {
        document.getElementById("password-error").innerHTML = "Login credentials invalid, please try again"
    }
}

window.onload = addLoginFunctionality()