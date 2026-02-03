import React from 'react';
import { Link } from 'react-router-dom';
import './RippleButton.css';

const RippleButton = ({
  text = 'Click Me',
  bgColor = '#3b82f6',
  circleColor = '#173eff',
  textColor = 'white',
  width,
  height,
  to,
  onClick,
  type = 'button',
  className = '',
  disabled = false,
}) => {
  const buttonStyle = {
    backgroundColor: bgColor,
    width: width,
    height: height,
    color: textColor,
  };

  const circleStyle = {
    backgroundColor: circleColor,
  };

  const content = (
    <>
      <span className="ripple-circle" style={circleStyle}></span>
      <span className="ripple-circle" style={circleStyle}></span>
      <span className="ripple-circle" style={circleStyle}></span>
      <span className="ripple-circle" style={circleStyle}></span>
      <span className="ripple-circle" style={circleStyle}></span>
      <span className="ripple-text">{text}</span>
    </>
  );

  // If "to" prop is provided, render as Link
  if (to) {
    return (
      <Link
        to={to}
        className={`ripple-btn ${className} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        style={buttonStyle}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={`ripple-btn ${className}`}
      style={buttonStyle}
      onClick={onClick}
      disabled={disabled}
    >
      {content}
    </button>
  );
};

export default RippleButton;
