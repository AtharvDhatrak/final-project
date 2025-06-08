import React from 'react';
const FeedbackForm = () => {
    return (
        <div className='page-background' style={containerStyle}>
          <div className='glass'> 
          <h2>How was your experience?</h2>
          <div>
            <p>What did you like about this? (Optional)</p>
            <label><input type="radio" name="like" /> I liked that it's fast</label><br />
            <label><input type="radio" name="like" /> Quality is great</label><br />
            <label><input type="radio" name="like" /> It's convenient</label>
          </div>
          <div>
            <p>What can we improve on? (Optional)</p>
            <label><input type="radio" name="improve" /> Can be faster</label><br />
            <label><input type="radio" name="improve" /> More options</label><br />
            <label><input type="radio" name="improve" /> Better quality</label>
          </div>
          <textarea 
            placeholder="Anything else you'd like to share?" 
            style={textareaStyle}
          />
          <button style={submitButtonStyle}>Submit Feedback</button>
        </div>
        </div>
      );};

      const containerStyle = {
        fontFamily: 'Arial, sans-serif',
        padding: '20px',
      };
      
      const textareaStyle = {
        width: '100%',
        height: '100px',
        marginTop: '10px',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #ccc',
      };
      
      const submitButtonStyle = {
        marginTop: '20px',
        padding: '10px 20px',
        borderRadius: '5px',
        background: '#007bff',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
      };
export default FeedbackForm;
