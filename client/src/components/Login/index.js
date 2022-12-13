import React from 'react'

const Login = () => {
    return (
        <div class="px-3">
            <h3 class="text-center mb-3">Welcome</h3>
                <div class="container col-md-6 bg-secondary text-center rounded-1 p-3">
                    <form class="login-form">
                        <h3 class="fw-bold">Login</h3>
                        <div>
                            <label for="email-login"></label>
                            <input type="text" placeholder="email" id="email-login" class="mt-2" />
                        </div>
                        <div>
                            <label for="password-login"></label>
                            <input type="password" placeholder="password" id="password-login" class="mt-2" />
                        </div>
                        <div>
                            <button type="submit" class="px-3 mt-2 fw-bold">Login</button>
                        </div>
                    </form>
                    <form class="signup-form mt-5">
                        <h3 class="fw-bold">New? Join Us!</h3>
                        <div>
                            <label for="username-signup"></label>
                            <input type="text" placeholder="username" id="username-signup" class="mt-2" />
                        </div>
                        <div>
                            <label for="email-signup"></label>
                            <input type="text" placeholder="email" id="email-signup" class="mt-2" />
                        </div>
                        <div>
                            <label for="password-signup"></label>
                            <input type="password" placeholder="password" id="password-signup" class="mt-2" />
                        </div>
                        <div>
                            <button type="submit" class="px-3 mt-2 fw-bold">Signup</button>
                        </div>
                    </form>
                </div>
        </div>
    )
}

export default Login