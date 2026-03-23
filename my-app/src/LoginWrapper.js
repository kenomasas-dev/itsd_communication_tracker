import React from 'react';
import { useNavigate } from 'react-router-dom';
import Login from './Staff/Login';

function LoginWrapper() {
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    navigate('/');
  };

  return <Login onLoginSuccess={handleLoginSuccess} />;
}

export default LoginWrapper;




