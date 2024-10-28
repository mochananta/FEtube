import React, { useState, useEffect } from "react";
import { Chart, registerables } from "chart.js";
import { TextField, Button, Grid, Paper, Typography, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination, InputAdornment } from "@mui/material";
import { Doughnut } from "react-chartjs-2";
import DownloadIcon from "@mui/icons-material/Download";
import CircularProgress from "@mui/material/CircularProgress";
import SearchIcon from "@mui/icons-material/Search";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
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
  const [keywords, setKeywords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [jobId, setJobId] = useState(null);
  const [selectedSentiment, setSelectedSentiment] = useState("All sentiment");
  const commentsPerPage = 5;
  const totalPages = Math.ceil(comments.length / commentsPerPage);
  const indexOfLastComment = currentPage * commentsPerPage;
  const indexOfFirstComment = indexOfLastComment - commentsPerPage;
  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  const handleSentimentChange = (e) => {
    setSelectedSentiment(e.target.value);
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

  const loadMoreComments = () => {
    pollJobStatus(jobId, currentPage + 1);
    setCurrentPage(currentPage + 1);
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
      console.log("Response from comments API:", data);

      const jobId = data.job_id;

      if (!jobId) {
        throw new Error("Job ID not found in response.");
      }

      setTimeout(async () => {
        await fetchVideoDetails(jobId);
      }, 10000);
      pollJobStatus(jobId);
    } catch (error) {
      setError(error.message === "Failed to fetch" ? "Tidak dapat terhubung ke server. Silakan cek koneksi internet atau coba lagi nanti." : "Terjadi kesalahan saat mengambil data. Silakan coba lagi!!");
      console.error("Error fetching comments:", error);
      setLoading(false);
    }
  };

  const pollJobStatus = async (jobId, page = 1, retries = 20, interval = 10000) => {
    let attempts = 0;

    const poll = setInterval(async () => {
      try {
        const response = await fetch(`http://207.148.117.200:8000/api/youtube/comments/result/${jobId}?page=${page}&limit=500`);
        if (response.ok) {
          const result = await response.json();
          console.log("Polling result:", result); // Log polling result

          if (result.detail) {
            console.log(result.detail);
            attempts++;
            if (attempts >= retries) {
              clearInterval(poll);
              setError("Gagal mendapatkan komentar setelah beberapa kali percobaan.");
              setLoading(false);
            }
            return;
          }

          if (Array.isArray(result.comments)) {
            console.log("Comments received in pollJobStatus:", result.comments); // Log comments yang diterima
            setComments((prevComments) => [...prevComments, ...result.comments]);
            setAllComments((prevComments) => [...prevComments, ...result.comments]);

            const totalSentiments = calculateSentimentData([...result.comments]);
            setTotalComments((prevTotal) => prevTotal + totalSentiments.Positive + totalSentiments.Neutral + totalSentiments.Negative);

            fetchCommentKeywords(jobId);

            if (result.comments.length < 500) {
              clearInterval(poll);
              setLoading(false);
            } else {
              page++;
            }
          } else {
            throw new Error("Comments not found in result.");
          }
        } else {
          console.error("Polling failed with status:", response.status);
          if (attempts >= retries) {
            clearInterval(poll);
            setError("Gagal mendapatkan komentar setelah beberapa kali percobaan.");
            setLoading(false);
          }
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
      console.log(`Fetching video details for job ID: ${jobId}`); // Log job ID
      if (!response.ok) {
        throw new Error("Failed to fetch video details.");
      }
      const data = await response.json();
      console.log("Response from video details API:", data); // Log response
      setFetchedVideoDetails(data);
    } catch (error) {
      console.error("Error fetching video details:", error);
      setError("Terjadi kesalahan saat mengambil detail video.");
    }
  };

  const fetchCommentKeywords = async (jobId) => {
    try {
      const response = await fetch(`http://207.148.117.200:8000/api/youtube/comments/keywords/${jobId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch comment keywords");
      }

      const data = await response.json();
      if (data.keyword_analysis) {
        setKeywords((prevKeywords) => [...prevKeywords, ...data.keyword_analysis]);
      } else {
        throw new Error("Keyword analysis not found in response");
      }
    } catch (error) {
      console.error("Error fetching comment keywords:", error);
    }
  };

  const calculateSentimentData = (comments) => {
    const sentimentCounts = {
      Positive: 0,
      Neutral: 0,
      Negative: 0,
    };

    comments.forEach((comment) => {
      const sentimentLabel = comment.sentiment_label;

      if (sentimentCounts[sentimentLabel.charAt(0).toUpperCase() + sentimentLabel.slice(1)] !== undefined) {
        sentimentCounts[sentimentLabel.charAt(0).toUpperCase() + sentimentLabel.slice(1)]++;
      }
    });

    setSentimentData({
      labels: ["Positive", "Neutral", "Negative"],
      datasets: [
        {
          data: [sentimentCounts.Positive, sentimentCounts.Neutral, sentimentCounts.Negative],
          backgroundColor: ["#34C759", "#065FD4", "#CC0000"],
        },
      ],
    });

    return sentimentCounts;
  };

  useEffect(() => {
    const totalSentiments = calculateSentimentData(comments);
    setTotalComments(totalSentiments.Positive + totalSentiments.Neutral + totalSentiments.Negative); // Update totalComments
  }, [comments]);

  const convertCommentsToCSV = (comments) => {
    const headers = ["Index", "Author", "Comment ID", "Text", "Channel", "Comment Date", "Keyword", "Sentiment"];
    const rows = comments.map((comment, index) => [
      index + 1,
      comment.author,
      comment.comment_id || comment.id,
      comment.text.replace(/"/g, '""'),
      comment.time_formatted,
      comment.keywords.length > 0 ? comment.keywords.join(", ") : "N/A",
      comment.sentiment ? comment.sentiment.label.charAt(0).toUpperCase() + comment.sentiment.label.slice(1) : "Unknown", // Cek apakah sentiment ada
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  };

  const downloadCSV = () => {
    const csvContent = convertCommentsToCSV(allComments);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Comments-Youtube.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredComments = comments.filter((comment) => {
    const matchesSearchTerm = comment.text && comment.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSentiment = selectedSentiment === "All sentiment" || comment.sentiment_label.toLowerCase() === selectedSentiment.toLowerCase();
    return matchesSearchTerm && matchesSentiment;
  });

  const commentsToDisplay = filteredComments.slice(indexOfFirstComment, indexOfLastComment);

  return (
    <>
      <Grid container spacing={3} className="main-container">
        <Grid item xs={12} style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "10px" }}>
            <img src="./tube.gif" alt="YouTube Logo" style={{ width: "45px", height: "auto", marginRight: "10px" }} />
            <Typography variant="h5" style={{ fontWeight: "bold", fontFamily: "Title Large/Font" }}>
              CommentTube
            </Typography>
          </div>
          <hr style={{ width: "100%", border: "1px solid #E4E0E0FF", marginTop: "1px", marginBottom: "10px" }} />
        </Grid>

        {/* Form Input API Key dan YouTube URL */}
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="YouTube Link...." variant="outlined" value={url} onChange={(e) => setUrl(e.target.value)} style={{ width: "203%", marginRight: "13px" }} />
        </Grid>
        <Grid item xs={12}>
          <Button fullWidth variant="contained" style={{ backgroundColor: "#CC0000", color: "white", fontWeight: "bold", fontSize: "16px", padding: "10px" }} onClick={handleFetchComments} disabled={loading}>
            <img src="./Vector.png" alt="Extract Icon" style={{ width: "25px", height: "25px", marginRight: "13px" }} />
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
                    | {fetchedVideoDetails.video_details.uploader.subscriber_count}
                  </Typography>
                </div>
              </>
            ) : (
              <div>
                {loading ? (
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <div style={{ backgroundColor: "#e0e0e0", width: "600px", height: "200px", marginRight: "20px", borderRadius: "8px" }} />
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ backgroundColor: "#e0e0e0", height: "30px", width: "80%", marginBottom: "10px", borderRadius: "4px" }} />
                      <div style={{ backgroundColor: "#e0e0e0", height: "20px", width: "100%", borderRadius: "4px", marginBottom: "8px" }} />
                      <div style={{ backgroundColor: "#e0e0e0", height: "20px", width: "100%", borderRadius: "4px", marginBottom: "8px" }} />
                      <div style={{ backgroundColor: "#e0e0e0", height: "20px", width: "100%", borderRadius: "4px" }} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "flex-start" }}>
                      <div style={{ backgroundColor: "#e0e0e0", width: "650px", height: "200px", marginRight: "20px", borderRadius: "8px" }} />
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ backgroundColor: "#e0e0e0", height: "30px", width: "80%", marginBottom: "10px", borderRadius: "4px" }} />
                        <div style={{ backgroundColor: "#e0e0e0", height: "20px", width: "100%", borderRadius: "4px", marginBottom: "8px" }} />
                        <div style={{ backgroundColor: "#e0e0e0", height: "20px", width: "100%", borderRadius: "4px", marginBottom: "8px" }} />
                        <div style={{ backgroundColor: "#e0e0e0", height: "20px", width: "100%", borderRadius: "4px" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", marginTop: "15px" }}>
                      <div style={{ backgroundColor: "#e0e0e0", width: "30px", height: "30px", borderRadius: "50%", marginRight: "10px" }} />
                      <div style={{ backgroundColor: "#e0e0e0", height: "20px", width: "40%", borderRadius: "4px" }} />
                    </div>
                    <Typography variant="body1" style={{ textAlign: "center", marginTop: "15px" }}>
                      No video available
                    </Typography>
                  </div>
                )}
              </div>
            )}
          </Paper>
        </div>

        <Grid item xs={12} md={6}>
          <div elevation={3} className="comment-keyword-paper">
            <Typography variant="h6" style={{ fontWeight: "bold", marginBottom: "10px" }}>
              Comment Keywords
            </Typography>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "20px" }}>
                <CircularProgress />
                <Typography variant="body1" style={{ marginTop: "10px" }}>
                  Loading comment keywords...
                </Typography>
              </div>
            ) : keywords.length > 0 ? (
              <div className="comment-keyword-container">
                {keywords.map((keyword, index) => (
                  <Chip key={index} label={keyword} className="comment-chip" />
                ))}
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ backgroundColor: "#e0e0e0", height: "30px", width: "30%", borderRadius: "4px", marginBottom: "10px" }} />
                      <div style={{ backgroundColor: "#e0e0e0", height: "30px", width: "30%", borderRadius: "4px", marginBottom: "10px" }} />
                      <div style={{ backgroundColor: "#e0e0e0", height: "30px", width: "30%", borderRadius: "4px", marginBottom: "10px" }} />
                    </div>
                  </div>
                </div>
                <Typography variant="body2" color="textSecondary" style={{ textAlign: "center", marginTop: "15px" }}>
                  No keywords found for the comments.
                </Typography>
              </div>
            )}
          </div>
        </Grid>

        <div elevation={3} className="sentiment-paper">
          <Typography variant="h6" style={{ fontWeight: "bold", marginBottom: "18px", marginLeft: "15px" }}>
            Sentiment Analytic
          </Typography>

          {loading ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <CircularProgress />
              <Typography variant="body1" style={{ marginTop: "10px" }}>
                Loading sentiment analytic...
              </Typography>
            </div>
          ) : (
            <div>
              <div className="sentiment-container">
                <div className="sentiment-chart">
                  {sentimentData.datasets[0].data.some((value) => value > 0) ? (
                    <>
                      <Doughnut
                        data={sentimentData}
                        options={{
                          cutout: "70%",
                        }}
                      />
                      <div className="sentiment-chart-text">
                        {totalComments} <br /> Sentiment
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "20px" }}>
                      <div style={{ backgroundColor: "#e0e0e0", height: "170px", width: "100%", borderRadius: "100px", marginBottom: "10px" }} />
                      <Typography variant="body2" style={{ textAlign: "center" }}>
                        No sentiment data available.
                      </Typography>
                    </div>
                  )}
                </div>

                <div className="sentiment-details">
                  <div className="sentiment-item" style={{ marginBottom: "15px" }}>
                    <div style={{ width: "15px", height: "15px", borderRadius: "50%", backgroundColor: "#CC0000", display: "inline-block", marginRight: "5px" }} />
                    <span style={{ fontWeight: 400 }}>
                      {" "}
                      Negative | <i style={{ marginLeft: "5px" }}>{sentimentData.datasets[0].data[2]} in total</i> | {totalComments > 0 ? ((sentimentData.datasets[0].data[2] / totalComments) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  <div className="sentiment-item" style={{ marginBottom: "15px" }}>
                    <div style={{ width: "15px", height: "15px", borderRadius: "50%", backgroundColor: "#065FD4", display: "inline-block", marginRight: "5px" }} />
                    <span style={{ fontWeight: 400 }}>
                      {" "}
                      Neutral | <i style={{ marginLeft: "5px" }}>{sentimentData.datasets[0].data[1]} in total</i> | {totalComments > 0 ? ((sentimentData.datasets[0].data[1] / totalComments) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  <div className="sentiment-item">
                    <div style={{ width: "15px", height: "15px", borderRadius: "50%", backgroundColor: "#34C759", display: "inline-block", marginRight: "5px" }} />
                    <span style={{ fontWeight: 400 }}>
                      {" "}
                      Positive | <i style={{ marginLeft: "5px" }}>{sentimentData.datasets[0].data[0]} in total</i> | {totalComments > 0 ? ((sentimentData.datasets[0].data[0] / totalComments) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table Comment Section */}
        <Grid item xs={12}>
          <Typography variant="h6" style={{ fontWeight: "bold", marginBottom: "10px" }}>
            Extracted Comment <i style={{ color: "#CC0000" }}>({totalComments})</i>
          </Typography>
          <div elevation={3} className="comment-table-paper" style={{ marginTop: "20px", marginBottom: "20px", padding: "20px" }}>
            {loading ? (
              <div className="loading-comments">
                <CircularProgress />
                Loading comments...
              </div>
            ) : (
              <>
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

                  <div style={{ display: "flex", alignItems: "center", marginRight: "10px" }}>
                    <CalendarMonthIcon style={{ marginRight: "7px", color: "#888" }} />
                    <Select value={selectedSentiment} variant="standard" className="custom-select" onChange={handleSentimentChange}>
                      <MenuItem value="All sentiment">All sentiment</MenuItem>
                      <MenuItem value="positive">Positive</MenuItem>
                      <MenuItem value="neutral">Neutral</MenuItem>
                      <MenuItem value="negative">Negative</MenuItem>
                    </Select>
                  </div>

                  <Button className="btn-download" style={{ marginRight: "10px" }} onClick={downloadCSV}>
                    <DownloadIcon />
                  </Button>
                </div>

                <TableContainer style={{ maxHeight: "100%", overflow: "auto" }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>No</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Comment ID</TableCell>
                        <TableCell>Comment content</TableCell>
                        <TableCell>Comment at</TableCell>
                        <TableCell>Comment keyword</TableCell>
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
                              <span style={{ color: "#3EA6FF" }}>{comment.comment_id}</span>
                            </TableCell>
                            <TableCell>{comment.text}</TableCell>
                            <TableCell>{comment.time_formatted}</TableCell>
                            <TableCell>
                              {comment.keywords && Array.isArray(comment.keywords) && comment.keywords.length > 0
                                ? comment.keywords.map((keyword, idx) => (
                                    <span
                                      key={idx}
                                      style={{
                                        padding: "5px 10px",
                                        border: "1px solid #000000FF",
                                        color: "#000000FF",
                                        borderRadius: "20px",
                                        margin: "5px",
                                        display: "inline-block",
                                        fontSize: "12px",
                                      }}
                                    >
                                      {keyword}
                                    </span>
                                  ))
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              <span
                                style={{
                                  padding: "5px 10px",
                                  backgroundColor: comment.sentiment_label === "positive" ? "#34C759" : comment.sentiment_label === "neutral" ? "#3EA6FF" : comment.sentiment_label === "negative" ? "#CC0000" : "#CCCCCC",
                                  color: "#fff",
                                  borderRadius: "20px",
                                  width: "100%",
                                }}
                              >
                                {comment.sentiment_label.charAt(0).toUpperCase() + comment.sentiment_label.slice(1)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            No comments available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                <Grid item xs={12}>
                  {loading ? <CircularProgress size={20} /> : <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} color="primary" style={{ marginTop: "20px", display: "flex", justifyContent: "center" }} />}
                </Grid>
              </>
            )}
          </div>
        </Grid>
      </Grid>
    </>
  );
}

export default App;
