import React, { useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { TextField, Button, Grid, Paper, Typography, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination, InputAdornment } from '@mui/material';
import { Pie } from 'react-chartjs-2';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import './App.css';

Chart.register(...registerables);

function App() {
  const [comments] = useState([
    { user: 'User 1', id: '1217fikad', comment: 'Crymore uefalona...', date: '12/05/2024 15:00', sentiment: 'Negative', keyword: 'Uefalona' },
    { user: 'User 2', id: '1217fikad', comment: 'Best elclasico ever!!!', date: '12/05/2024 15:10', sentiment: 'Positive', keyword: 'El-clasico' },
    { user: 'User 3', id: '1217fikad', comment: 'I think Barca play well tonight...', date: '12/05/2024 15:10', sentiment: 'Neutral', keyword: 'Barcelona' }
  ]);

  const sentimentData = {
    labels: ['Negative', 'Neutral', 'Positive'],  
    datasets: [{
      data: [25, 25, 50],
      backgroundColor: ['#CC0000', '#065FD4', '#34C759'],
    }],
  };

  const videoUrl = "https://www.youtube.com/watch?v=7gK4jUMWnE0"; 
  const videoId = videoUrl.split('v=')[1].split('&')[0]; 
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`; 

  const videoDetails = {
    title: "🔥🔥 BARÇA 5-1 VIKTORIA PLZEN, LEWY STUNS WITH FIRST HAT-TRICK | UN DÍA DE PARTIT (EPISODE 2) 🔥🔥",
    description: "Lorem ipsum odor amet, consectetuer adipiscing elit. Ablandit risus placerat senectus aptent pulvinar curae class arcu. Magna tellus ad per litora lacinia eu consequat vivamus. At lectus dictum pretium maximus pretium dolor cursus justo. Ac habitasse purus conubia auctor eleifend bibendum ac class finibus. Fames hac vel eget ipsum lectus fusce velit. Torquent commodo senectus posuere metus hac ullamcorper. Venenatis posuere enim urna in lorem metus; praesent habitasse curabitur.",
    channelName: "FC Barcelona",
    subscribers: "14.1M",
    keywords: ["Barcelona", "Real Madrid", "Lewandowski", "Referee", "Vinicius", "Uefalona", "Vardrid", "El-clasico", "CR7", "LM10", "CR7", "Salah", "Gakpo", "VanDick", "Premire League", "Liverpool", "FC Mobile"]
  };

  return (
    <Grid container spacing={3} className="main-container">
      <Grid item xs={12} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding:'10px' }}>
          <img src="./image.png" alt="YouTube Logo" style={{ width: '30px', height: '30px', marginRight: '10px' }} />
          <Typography variant="h5" style={{ fontWeight: 'bold', fontFamily:'Title Large/Font' }}>CommentTube</Typography>
        </div>
        <hr style={{ width: '100%', border: '1px solid #E4E0E0FF', marginTop: '5px', marginBottom: '10px' }} />
      </Grid>

    {/* Form Input API Key dan YouTube URL */}
    <Grid item xs={12} md={6}>
      <TextField fullWidth label="API Key here...." variant="outlined" style={{ marginBottom: '10px' }} />
    </Grid>
    <Grid item xs={12} md={6}>
      <TextField fullWidth label="YouTube Link...." variant="outlined" style={{ marginBottom: '10px' }} />
    </Grid>
    <Grid item xs={12}>
      <Button fullWidth variant="contained" style={{ backgroundColor: '#CC0000', color: 'white', fontWeight: 'bold', fontSize: '16px', padding: '10px' }}>
        <img 
          src="./vector.png" 
          alt="Extract Icon" 
          style={{ width: '25px', height: '25px', marginRight: '13px' }} 
        />
        EXTRACT COMMENTS
      </Button>
      <hr style={{ width: '100%', border: '1px solid #E4E0E0FF', marginTop: '40px', marginBottom: '10px' }} />
    </Grid>

    
    <div style={{ marginBottom: '20px' }}>
        <Typography variant="h6" className="detail-video-title" style={{ fontWeight: 'bold', marginBottom: '5px', margin:'30px' }}>
          Detail Video
        </Typography>

      <Paper elevation={3} className="video-detail" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {/* Thumbnail Video */}
          <img
            src={thumbnailUrl}
            alt="Video Thumbnail"
            style={{ marginRight: '20px', width: '350px', height: 'auto' }}
          />

          {/* Title dan Deskripsi di sebelah kanan Thumbnail */}
          <div style={{ flexGrow: 1 }}>
            <Typography variant="h6" className="video-title">
              {videoDetails.title}
            </Typography>
            
            <div className="video-description-container">
              <Typography variant="body2" className="video-description">
                {videoDetails.description}
              </Typography>
            </div>
          </div>
        </div>

        {/* FC Barcelona logo dan Subscriber Count di bawah Thumbnail */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '15px' }}>
          <img
            src="./Frame 37.png"
            alt="FC Barcelona Logo"
            style={{ width: '30px', height: '30px', marginRight: '10px' }}
          />
          <Typography variant="subtitle2" className="video-channel">
            <strong className="channel-name"> { videoDetails.channelName} </strong> 
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg"
              alt="Verified Badge"
              style={{ width: '16px', height: '16px', margin: '7px' }}
            /> 
            | {videoDetails.subscribers} Subscribers
          </Typography>
        </div>
      </Paper>
    </div>


      {/* Comment Keywords Section */}
      <Grid item xs={12} md={6}>
        <div elevation={3} className="comment-keyword-paper">
          <Typography variant="h6" style={{ fontWeight: 'bold', marginBottom: '10px' }}>Comment keyword</Typography>
          <div className="comment-keyword-container">
            {videoDetails.keywords.map((keyword, index) => (
              <Chip key={index} label={keyword} className="comment-chip" />
            ))}
          </div>
        </div>
      </Grid>

      <div elevation={3} className="sentiment-paper">
        <Typography variant="h6" style={{ fontWeight: 'bold', marginBottom: '18px', marginLeft: '15px' }}>Sentiment Analytic</Typography>
        <div className="sentiment-container">  
          {/* Pie chart */}
          <div className="sentiment-chart">
            <Pie data={sentimentData} />
          </div>
          
        {/* Deskripsi Analitik Sentimen */}
        <div className="sentiment-details">
          <Typography variant="body2" className="sentiment-total" style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            1500 Sentiments
          </Typography>
          <Typography variant="body2" className="sentiment-item">
            <div style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: '#CC0000', display: 'inline-block', marginRight: '5px' }} />
            <div> Negative | <i style={{ marginLeft: '5px' }}>500 in total</i> | 25%</div>
          </Typography>
          <Typography variant="body2" className="sentiment-item">
            <div style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: '#065FD4', display: 'inline-block', marginRight: '5px' }} />
            <div> Neutral | <i style={{ marginLeft: '5px' }}>500 in total</i> | 25%</div>
          </Typography>
          <Typography variant="body2" className="sentiment-item">
            <div style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: '#34C759', display: 'inline-block', marginRight: '5px' }} />
            <div> Positive | <i style={{ marginLeft: '5px' }}>1000 in total</i> | 50%</div>
          </Typography>
        </div>
        </div>
      </div>


    {/* Table Comment Section */}
    <Grid item xs={12}>
      <Typography variant="h6" style={{ fontWeight: 'bold', marginBottom: '10px' }}>
        Extracted Comment <i style={{ color: '#CC0000' }} >(1.245)</i>
      </Typography>
      <div elevation={3} className="comment-table-paper" style={{ marginTop: '20px', marginBottom: '20px', padding: '20px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', width: '100%' }}>
          <TextField
            className="search-input"
            variant="outlined" 
            label="Search..." 
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            style={{ flex: 1, marginRight: '10px' }}/>
          <Select
            defaultValue="All sentiment"
            variant="standard"
            className="custom-select"
          >
            <MenuItem value="All sentiment">All sentiment</MenuItem>
            <MenuItem value="Positive">Positive</MenuItem>
            <MenuItem value="Neutral">Neutral</MenuItem>
            <MenuItem value="Negative">Negative</MenuItem>
          </Select>
          <Button className="btn-download" style={{ marginRight: '10px' }}>
            <DownloadIcon />
          </Button>
        </div>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>No</TableCell> 
                <TableCell>User</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Comment</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Keyword</TableCell>
                <TableCell>Sentiment</TableCell> 
              </TableRow>
            </TableHead>
            <TableBody>
              {comments.map((comment, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{comment.user}</TableCell>
                  <TableCell>
                    <span style={{ color: '#3EA6FF' }}>{comment.id}</span>
                  </TableCell>
                  <TableCell>{comment.comment}</TableCell>
                  <TableCell>{comment.date}</TableCell>
                  <TableCell>
                    <span
                      style={{
                        padding: '5px 10px',
                        border: '1px solid #000000FF',
                        color: '#000000FF', 
                        borderRadius: '20px'}}>
                      {comment.keyword}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      style={{
                        padding: '5px 10px', 
                        backgroundColor:
                          comment.sentiment === 'Positive'
                            ? '#34C759' 
                            : comment.sentiment === 'Neutral'
                            ? '#3EA6FF' 
                            : '#CC0000',
                        color: '#fff  ',
                        borderRadius: '20px',
                        width: '100%'}}>
                      {comment.sentiment}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Grid item xs={12}>
          <Pagination count={10} color="primary" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}/>
        </Grid>
      </div>
    </Grid>
    </Grid>
  );
}

export default App;
