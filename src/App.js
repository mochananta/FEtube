import React, { useState, useEffect } from "react";
import { Chart, registerables } from "chart.js";
import { TextField, Button, Grid, Paper, Typography, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination, InputAdornment } from "@mui/material";
import { Pie } from "react-chartjs-2";
import DownloadIcon from "@mui/icons-material/Download";
import SearchIcon from "@mui/icons-material/Search";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import "./App.css";

Chart.register(...registerables);

function App() {
  const [url, setUrl] = useState("");
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allComments, setAllComments] = useState([]);
  const [error, setError] = useState("");
  const [fetchedVideoDetails, setFetchedVideoDetails] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSentiment, setSelectedSentiment] = useState("All sentiment");
  const commentsPerPage = 5;
  const totalPages = Math.ceil(comments.length / commentsPerPage);
  const indexOfLastComment = currentPage * commentsPerPage;
  const indexOfFirstComment = indexOfLastComment - commentsPerPage;
  // const currentComments = comments.slice(indexOfFirstComment, indexOfLastComment);
  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  const [sentimentData, setSentimentData] = useState({
    labels: ["Positive", "Neutral", "Negative"],
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: ["#34C759", "#065FD4", "#CC0000"],
      },
    ],
  });

  const videoDetails = {
    // title: "🔥🔥 BARÇA 5-1 VIKTORIA PLZEN, LEWY STUNS WITH FIRST HAT-TRICK | UN DÍA DE PARTIT (EPISODE 2) 🔥🔥",
    // description:
    //   "Lorem ipsum odor amet, consectetuer adipiscing elit. Ablandit risus placerat senectus aptent pulvinar curae class arcu. Magna tellus ad per litora lacinia eu consequat vivamus. At lectus dictum pretium maximus pretium dolor cursus justo. Ac habitasse purus conubia auctor eleifend bibendum ac class finibus. Fames hac vel eget ipsum lectus fusce velit. Torquent commodo senectus posuere metus hac ullamcorper. Venenatis posuere enim urna in lorem metus; praesent habitasse curabitur.",
    // channelName: "FC Barcelona",
    // subscribers: "14.1M",
    keywords: ["Barcelona", "Real Madrid", "Lewandowski", "Referee", "Vinicius", "Uefalona", "Vardrid", "El-clasico", "CR7", "LM10", "CR7", "Salah", "Gakpo", "VanDick", "Premire League", "Liverpool", "FC Mobile"],
  };

  const handleFetchComments = async () => {
    setLoading(true);
    setComments([]);
    setError("");
    setTotalComments(0);
    setAllComments([]);

    try {
      const response = await fetch(`http://207.148.117.200:8000/api/youtube/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          pretty: false,
          sort: 1,
          language: "id",
        }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      const jobId = data.job_id;

      if (!jobId) {
        throw new Error("Job ID not found in response.");
      }

      await fetchVideoDetails(jobId);
      pollJobStatus(jobId);
    } catch (error) {
      if (error.message === "Failed to fetch") {
        setError("Tidak dapat terhubung ke server. Silakan cek koneksi internet atau coba lagi nanti.");
      } else {
        setError("Terjadi kesalahan saat mengambil data. Silakan coba lagi!!");
      }
      console.error("Error fetching comments:", error);
      setLoading(false);
    }
  };

  const pollJobStatus = async (jobId, retries = 20, interval = 10000) => {
    let attempts = 0;

    const poll = setInterval(async () => {
      try {
        const response = await fetch(`http://207.148.117.200:8000/api/youtube/comments/result/${jobId}`);

        if (response.ok) {
          const result = await response.json();
          console.log("Polling result:", result);

          if (result.detail) {
            console.log(result.detail);
            attempts++;
            return;
          }

          if (result && Array.isArray(result.comments)) {
            setComments(result.comments);
            setAllComments(result.comments);
            setTotalComments(result.comments.length);
            setLoading(false);
            clearInterval(poll);
          } else {
            throw new Error("Comments not found in result.");
          }

          clearInterval(poll);
        } else if (attempts >= retries) {
          clearInterval(poll);
          throw new Error("Job result not found after multiple attempts.");
        }
      } catch (error) {
        console.error("Polling error:", error);
        setError("Terjadi kesalahan saat mengambil hasil komentar.");
        clearInterval(poll);
        setLoading(false);
      }
    }, interval);
  };

  const fetchVideoDetails = async (jobId) => {
    try {
      const response = await fetch(`http://207.148.117.200:8000/api/youtube/video/${jobId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch video details.");
      }
      const data = await response.json();
      setFetchedVideoDetails(data);
    } catch (error) {
      console.error("Error fetching video details:", error);
      setError("Terjadi kesalahan saat mengambil detail video.");
    }
  };

  const calculateSentimentData = (comments) => {
    const sentimentCounts = {
      Positive: 0,
      Neutral: 0,
      Negative: 0,
    };

    comments.forEach((comment) => {
      const sentiment = comment.sentiment.label.charAt(0).toUpperCase() + comment.sentiment.label.slice(1);
      if (sentimentCounts[sentiment] !== undefined) {
        sentimentCounts[sentiment]++;
      }
    });

    const totalSentiments = comments.length;

    setSentimentData({
      labels: ["Positive", "Neutral", "Negative"],
      datasets: [
        {
          data: [sentimentCounts.Positive, sentimentCounts.Neutral, sentimentCounts.Negative],
          backgroundColor: ["#34C759", "#065FD4", "#CC0000"],
        },
      ],
    });

    return totalSentiments;
  };

  useEffect(() => {
    const totalSentiments = calculateSentimentData(comments);
    setTotalComments(totalSentiments);
  }, [comments]);

  const convertCommentsToCSV = (comments) => {
    const headers = ["Index", "Author", "Comment ID", "Text", "Channel", "Comment Date", "Keyword", "Sentiment"];
    const rows = comments.map((comment, index) => [
      index + 1,
      comment.author,
      comment.id,
      comment.text.replace(/"/g, '""'),
      comment.channel,
      comment.comment_at,
      comment.keyword || "N/A",
      comment.sentiment.label.charAt(0).toUpperCase() + comment.sentiment.label.slice(1),
    ]);
    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  };

  const downloadCSV = () => {
    const csvContent = convertCommentsToCSV(allComments);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "comments.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredComments = comments.filter((comment) => {
    const matchesSearchTerm = comment.text && comment.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSentiment = selectedSentiment === "All sentiment" || comment.sentiment.label.toLowerCase() === selectedSentiment.toLowerCase();
    return matchesSearchTerm && matchesSentiment;
  });

  const commentsToDisplay = filteredComments.slice(indexOfFirstComment, indexOfLastComment);

  return (
    <>
      {loading && (
        <div className="spinner-overlay">
          <div className="spinner"></div>
        </div>
      )}
      <Grid container spacing={3} className="main-container">
        <Grid item xs={12} style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "10px" }}>
            <img src="./image.png" alt="YouTube Logo" style={{ width: "30px", height: "30px", marginRight: "10px" }} />
            <Typography variant="h5" style={{ fontWeight: "bold", fontFamily: "Title Large/Font" }}>
              CommentTube
            </Typography>
          </div>
          <hr style={{ width: "100%", border: "1px solid #E4E0E0FF", marginTop: "5px", marginBottom: "10px" }} />
        </Grid>

        {/* Form Input API Key dan YouTube URL */}
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="API Key here...." variant="outlined" style={{ marginBottom: "10px" }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="YouTube Link...." variant="outlined" value={url} onChange={(e) => setUrl(e.target.value)} style={{ marginBottom: "10px" }} />
        </Grid>
        <Grid item xs={12}>
          <Button fullWidth variant="contained" style={{ backgroundColor: "#CC0000", color: "white", fontWeight: "bold", fontSize: "16px", padding: "10px" }} onClick={handleFetchComments} disabled={loading}>
            <img src="./vector.png" alt="Extract Icon" style={{ width: "25px", height: "25px", marginRight: "13px" }} />
            {loading ? "Memuat..." : "EXTRACT COMMENTS"}
          </Button>
          {error && <div style={{ color: "red", textAlign: "center", marginTop: "10px" }}>{error}</div>}
          <hr style={{ width: "100%", border: "1px solid #E4E0E0FF", marginTop: "40px", marginBottom: "10px" }} />
        </Grid>

        <div style={{ marginBottom: "20px" }}>
          <Typography variant="h6" className="detail-video-title" style={{ fontWeight: "bold", marginBottom: "5px", margin: "30px" }}>
            Detail Video
          </Typography>

          <Paper elevation={3} className="video-detail" style={{ padding: "20px" }}>
            {fetchedVideoDetails ? (
              <>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  {/* Thumbnail Video */}
                  <img src={`https://img.youtube.com/vi/${fetchedVideoDetails.video_embed_url.split("/embed/")[1]}/maxresdefault.jpg`} alt="Video Thumbnail" style={{ marginRight: "20px", width: "350px", height: "auto" }} />

                  {/* Title dan Deskripsi di sebelah kanan Thumbnail */}
                  <div style={{ flexGrow: 1 }}>
                    <Typography variant="h6" className="video-title">
                      {fetchedVideoDetails.video_details.uploader.title}
                    </Typography>

                    <div className="video-description-container">
                      <Typography variant="body2" className="video-description">
                        {fetchedVideoDetails.video_details.uploader.description}
                      </Typography>
                    </div>
                  </div>
                </div>

                {/* Uploader info */}
                <div style={{ display: "flex", alignItems: "center", marginTop: "15px" }}>
                  <img src={fetchedVideoDetails.video_details.uploader.photo} alt="Uploader Logo" style={{ width: "30px", height: "30px", marginRight: "10px" }} />
                  <Typography variant="subtitle2" className="video-channel">
                    <strong className="channel-name"> {fetchedVideoDetails.video_details.uploader.username} </strong>
                    {fetchedVideoDetails.video_details.uploader.verified && (
                      <img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" alt="Verified Badge" style={{ width: "16px", height: "16px", margin: "7px" }} />
                    )}
                    | {fetchedVideoDetails.video_details.uploader.subscriber_count.toLocaleString()} Subscribers
                  </Typography>
                </div>
              </>
            ) : (
              <div className="loading-video">Loading video details...</div>
            )}
          </Paper>
        </div>

        {/* Comment Keywords Section */}
        <Grid item xs={12} md={6}>
          <div elevation={3} className="comment-keyword-paper">
            <Typography variant="h6" style={{ fontWeight: "bold", marginBottom: "10px" }}>
              Comment keyword
            </Typography>
            <div className="comment-keyword-container">
              {videoDetails.keywords.map((keyword, index) => (
                <Chip key={index} label={keyword} className="comment-chip" />
              ))}
            </div>
          </div>
        </Grid>

        <div elevation={3} className="sentiment-paper">
          <Typography variant="h6" style={{ fontWeight: "bold", marginBottom: "18px", marginLeft: "15px" }}>
            Sentiment Analytic
          </Typography>
          <div className="sentiment-container">
            {/* Pie chart */}
            <div className="sentiment-chart">
              <Pie data={sentimentData} />
            </div>

            {/* Deskripsi Analitik Sentimen */}
            <div className="sentiment-details">
              <Typography variant="body2" className="sentiment-total" style={{ fontWeight: "bold", marginBottom: "5px" }}>
                {totalComments} Sentiments
              </Typography>
              <div className="sentiment-item">
                <div style={{ width: "15px", height: "15px", borderRadius: "50%", backgroundColor: "#CC0000", display: "inline-block", marginRight: "5px" }} />
                <span>
                  Negative | <i style={{ marginLeft: "5px" }}>{sentimentData.datasets[0].data[2]} in total</i> | {((sentimentData.datasets[0].data[2] / totalComments) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="sentiment-item">
                <div style={{ width: "15px", height: "15px", borderRadius: "50%", backgroundColor: "#065FD4", display: "inline-block", marginRight: "5px" }} />
                <span>
                  Neutral | <i style={{ marginLeft: "5px" }}>{sentimentData.datasets[0].data[1]} in total</i> | {((sentimentData.datasets[0].data[1] / totalComments) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="sentiment-item">
                <div style={{ width: "15px", height: "15px", borderRadius: "50%", backgroundColor: "#34C759", display: "inline-block", marginRight: "5px" }} />
                <span>
                  Positive | <i style={{ marginLeft: "5px" }}>{sentimentData.datasets[0].data[0]} in total</i> | {((sentimentData.datasets[0].data[0] / totalComments) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Table Comment Section */}
        <Grid item xs={12}>
          <Typography variant="h6" style={{ fontWeight: "bold", marginBottom: "10px" }}>
            Extracted Comment <i style={{ color: "#CC0000" }}>({totalComments})</i>
          </Typography>
          <div elevation={3} className="comment-table-paper" style={{ marginTop: "20px", marginBottom: "20px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", width: "100%" }}>
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
                style={{ flex: 1, marginRight: "10px" }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select value={selectedSentiment} variant="standard" className="custom-select" onChange={(e) => setSelectedSentiment(e.target.value)}>
                <MenuItem value="All sentiment">All sentiment</MenuItem>
                <MenuItem value="Positive">Positive</MenuItem>
                <MenuItem value="Neutral">Neutral</MenuItem>
                <MenuItem value="Negative">Negative</MenuItem>
              </Select>
              <Button className="btn-download" style={{ marginRight: "10px" }} onClick={downloadCSV}>
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
                    <TableCell>Channel</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Keyword</TableCell>
                    <TableCell>Sentiment</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {commentsToDisplay.length > 0 ? (
                    commentsToDisplay.map((comment, index) => (
                      <TableRow key={index}>
                        <TableCell>{indexOfFirstComment + index + 1}</TableCell>
                        <TableCell>{comment.author}</TableCell>
                        <TableCell>
                          <span style={{ color: "#3EA6FF" }}>{comment.id}</span>
                        </TableCell>
                        <TableCell>{comment.text}</TableCell>
                        <TableCell>{comment.channel}</TableCell>
                        <TableCell>{comment.comment_at}</TableCell>
                        <TableCell>
                          <span
                            style={{
                              padding: "5px 10px",
                              border: "1px solid #000000FF",
                              color: "#000000FF",
                              borderRadius: "20px",
                            }}
                          >
                            {comment.keyword || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            style={{
                              padding: "5px 10px",
                              backgroundColor: comment.sentiment.label === "positive" ? "#34C759" : comment.sentiment.label === "neutral" ? "#3EA6FF" : "#CC0000",
                              color: "#fff",
                              borderRadius: "20px",
                              width: "100%",
                            }}
                          >
                            {comment.sentiment.label.charAt(0).toUpperCase() + comment.sentiment.label.slice(1)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} align="center" style={{ fontStyle: "italic" }}>
                        Tidak ada komentar
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <Grid item xs={12}>
              <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} color="primary" style={{ marginTop: "20px", display: "flex", justifyContent: "center" }} />
            </Grid>
          </div>
        </Grid>
      </Grid>
    </>
  );
}

export default App;
