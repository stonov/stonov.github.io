import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@mui/material';
import { Paper } from '@mui/material';


function Home() {
    let navigate = useNavigate();

    const handleDefaultPageOnClick = async () => {
        navigate("/react-default", { replace: false });
    }

    return (
      <div>
          <Paper
            children={
                <div>
                    Welcome Home
                    <Button
                        variant="contained"
                        onClick={handleDefaultPageOnClick}
                    >React Default Page</Button>
                </div>}
            />
      </div>
    );
  }
  
export default Home;
