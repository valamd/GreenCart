import React, { useState } from "react";
import { loginUser } from "../../api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../ui/Card";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Leaf, Mail, Lock, Eye, EyeOff } from "lucide-react";
import SocialLogin from './SocialLogin';
import { useNavigate } from "react-router-dom"; // Import navigation hook

const Login = ({ onSwitchToRegister, showNotification }) => {
  const navigate = useNavigate(); // Initialize navigation hook
  const [formData, setFormData] = useState({
    UserEmail: "",
    Password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await loginUser(formData);
      console.log("Login Response:", response.data); // Debugging: Check backend response
  
      if (response.data.token) {
        // Store token and set session status
        localStorage.setItem("authToken", response.data.token);
        localStorage.setItem("userRole", response.data.role);
        
        sessionStorage.setItem("hadSession", "true"); // ✅ Mark successful login
  
        showNotification("Login successful!");
        
        // Redirect user based on role
        setTimeout(() => {
          navigate(response.data.role === "Admin" ? "/admin-dashboard" : "/home");
        }, 1000);
      } else {
        showNotification("Login failed! Invalid credentials");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "❌ Invalid email or password!";
      
      // Ensure session isn't marked as expired just because of wrong credentials
      if (error.response && error.response.status === 401) {
        sessionStorage.setItem("hadSession", "false");
      }
  
      showNotification(errorMessage);
    }
  };
  
  
  

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <Leaf className="h-12 w-12 text-green-600" />
        </div>
        <CardTitle className="text-2xl text-center text-green-800">Welcome Back</CardTitle>
        <CardDescription className="text-center">
          Sign in to your GreenCart account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="UserEmail">
              Email
            </label>
            <div className="relative">
              <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                id="UserEmail"
                type="email"
                name="UserEmail"
                placeholder="Enter your email"
                value={formData.UserEmail}
                onChange={handleChange}
                className="pl-10 border-green-200 focus:border-green-500 focus:ring-green-500"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="Password">
              Password
            </label>
            <div className="relative">
              <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                id="Password"
                type={showPassword ? "text" : "password"}
                name="Password"
                placeholder="Enter your password"
                value={formData.Password}
                onChange={handleChange}
                className="pl-10 pr-10 border-green-200 focus:border-green-500 focus:ring-green-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white">
            Sign In
          </Button>
        </form>
        {message && <p className="text-center text-sm mt-2 text-green-500">{message}</p>}
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <button onClick={onSwitchToRegister} className="text-green-600 hover:text-green-500">
            Sign up
          </button>
        </p>
      </CardFooter>
      {/* <SocialLogin /> */}
    </Card>
  );
};

export default Login;
