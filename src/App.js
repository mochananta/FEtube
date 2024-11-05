import { TextField, Button, Grid, Paper, Typography, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Pagination } from "@mui/material";
import React, { useState, useEffect, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Chart, registerables } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import "./App.css";
import "./reponsive.css";

Chart.register(...registerables);

function App() {
  const [url, setUrl] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const datePickerRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [showSentiment, setShowSentiment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allComments, setAllComments] = useState([]);
  const [error, setError] = useState("");
  const [fetchedVideoDetails, setFetchedVideoDetails] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [keywords, setKeywords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [jobId] = useState(null);
  const [selectedSentiment, setSelectedSentiment] = useState("All sentiment");
  const [selectedDate, setSelectedDate] = useState(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "text", direction: "ascending" });
  const commentsPerPage = 5;
  const totalPages = Math.ceil(comments.length / commentsPerPage);
  const indexOfLastComment = currentPage * commentsPerPage;
  const indexOfFirstComment = indexOfLastComment - commentsPerPage;
  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  const renderPollingStatus = () => {
    if (isPolling) {
      return <p className="polling-status">Polling sedang berlangsung, harap tunggu...</p>;
    }
    return null;
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setIsDatePickerVisible(false);
  };

  const toggleDatePicker = () => {
    setIsDatePickerVisible(!isDatePickerVisible);
  };

  const handleClickOutside = (event) => {
    if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
      setIsDatePickerVisible(false);
      setSelectedDate(null);
      setComments(allComments);
    }
  };

  useEffect(() => {
    if (isDatePickerVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDatePickerVisible]);

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
    setShowSentiment(true);

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

      await fetchCommentKeywords(jobId);

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
    setIsPolling(true);

    const poll = setInterval(async () => {
      try {
        const response = await fetch(`http://207.148.117.200:8000/api/youtube/comments/result/${jobId}?page=${page}&limit=500`);
        if (response.ok) {
          const result = await response.json();
          console.log("Polling result:", result);

          if (result.detail) {
            console.log(result.detail);
            attempts++;
            if (attempts >= retries) {
              clearInterval(poll);
              setError("Gagal mendapatkan komentar setelah beberapa kali percobaan.");
              setLoading(false);
              setIsPolling(false);
            }
            return;
          }

          if (Array.isArray(result.comments)) {
            setComments((prevComments) => [...prevComments, ...result.comments]);
            setAllComments((prevComments) => [...prevComments, ...result.comments]);

            if (page === 1) {
              setLoading(false);
            }

            const totalSentiments = calculateSentimentData([...result.comments]);
            setTotalComments((prevTotal) => prevTotal + totalSentiments.Positive + totalSentiments.Neutral + totalSentiments.Negative);

            fetchCommentKeywords(jobId);

            if (result.comments.length < 500) {
              clearInterval(poll);
              setLoading(false);
              setIsPolling(false);
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
            setIsPolling(false);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        setError("Terjadi kesalahan saat mengambil hasil komentar.");
        clearInterval(poll);
        setLoading(false);
        setIsPolling(false);
      }
    }, interval);
  };

  const fetchVideoDetails = async (jobId) => {
    try {
      const response = await fetch(`http://207.148.117.200:8000/api/youtube/video/${jobId}`);
      console.log(`Fetching video details for job ID: ${jobId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch video details.");
      }
      const data = await response.json();
      console.log("Response from video details API:", data);
      setFetchedVideoDetails(data);
    } catch (error) {
      console.error("Error fetching video details:", error);
      setError("Terjadi kesalahan saat mengambil detail video.");
    }
  };

  const fetchCommentKeywords = async (jobId) => {
    try {
      const response = await fetch(`http://207.148.117.200:8000/api/youtube/comments/keywords/${jobId}`);
      if (!response.ok) throw new Error("Failed to fetch comment keywords");

      const data = await response.json();
      if (data.keyword_analysis) {
        setKeywords((prevKeywords) => [...new Set([...prevKeywords, ...data.keyword_analysis])]);
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
    const header = "No,User,Comment ID,Comment content,Comment at,Comment keyword,Sentiment\n";

    const rows = comments.map((comment, index) => {
      const no = index + 1;
      const user = comment.author ? comment.author.replace(/"/g, '""').replace(/[\n\r]+/g, " ") : "N/A"; // Menghindari tanda kutip dan newline
      const commentId = comment.comment_id ? comment.comment_id.replace(/"/g, '""') : "N/A";
      const content = comment.text ? comment.text.replace(/"/g, '""').replace(/[\n\r]+/g, " ") : "N/A"; // Menghindari newline
      const commentAt = comment.time_formatted ? comment.time_formatted.replace(/"/g, '""') : "N/A";
      const keywords =
        comment.keywords && Array.isArray(comment.keywords)
          ? comment.keywords
              .join("; ")
              .replace(/"/g, '""')
              .replace(/[\n\r]+/g, " ")
          : "N/A";
      const sentiment = comment.sentiment_label ? comment.sentiment_label.replace(/"/g, '""') : "N/A";

      return `${no},"${user}","${commentId}","${content}","${commentAt}","${keywords}","${sentiment}"`; // Menambahkan tanda kutip
    });

    return header + rows.join("\n");
  };

  const downloadCSV = () => {
    const dataToDownload = filteredComments.length > 0 ? filteredComments : allComments;
    const csvContent = convertCommentsToCSV(dataToDownload);
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

  const showDatePicker = () => {
    if (datePickerRef.current) {
      datePickerRef.current.setOpen(true);
    }
  };

  const selectedDateFormatted = selectedDate ? new Date(selectedDate).toLocaleDateString("en-GB") : null;

  const sortedComments = (comments) => {
    return [...comments].sort((a, b) => {
      const isAsc = sortConfig.direction === "ascending";
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return isAsc ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return isAsc ? 1 : -1;
      }
      return 0;
    });
  };

  const filteredComments = comments.filter((comment) => {
    const commentDate = comment.time_formatted ? comment.time_formatted.split(" ")[0] : null; // Extract dd/MM/yyyy part if available
    const matchesDate = !selectedDateFormatted || commentDate === selectedDateFormatted;

    const matchesSearchTerm = comment.text && comment.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSentiment = selectedSentiment === "All sentiment" || comment.sentiment_label.toLowerCase() === selectedSentiment.toLowerCase();

    return matchesDate && matchesSearchTerm && matchesSentiment;
  });

  const commentsToDisplay = filteredComments.slice(indexOfFirstComment, indexOfLastComment);
  const sortedCommentsToDisplay = sortedComments(commentsToDisplay);

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "ascending" ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />;
    }
    return null;
  };

  return (
    <>
      <Grid container spacing={3} className="main-container">
        <Grid item xs={12} className="commentTubeContainer">
          <div className="commentTubeHeader">
            <img src="./image.png" alt="YouTube Logo" className="commentTubeLogo" />
            <Typography variant="h5" className="commentTubeTitle">
              CommentTube
            </Typography>
          </div>
          <hr className="commentTubeDivider" />
        </Grid>

        {/* Form Input API Key dan YouTube URL */}
        <Grid item xs={12} md={12}>
          <TextField fullWidth label="YouTube Link...." variant="outlined" value={url} onChange={(e) => setUrl(e.target.value)} className="youtubeInput" />
        </Grid>
        <Grid item xs={12}>
          <Button fullWidth variant="contained" className="extractButton" onClick={handleFetchComments} disabled={loading}>
            <img src="./Vector.png" alt="Extract Icon" className="extractIcon" />
            <span style={{ color: loading ? "white" : "inherit" }}>{loading ? "Memuat..." : "EXTRACT COMMENTS"}</span>
          </Button>
          {error && <div className="errorText">{error}</div>}
          <hr className="divider" />
        </Grid>

        <Grid item xs={12}>
          <div className="videoDetailContainer">
            <Typography variant="h6" className="detailVideoTitle">
              Video Detail
            </Typography>

            <Paper elevation={3} className="videoDetail">
              {fetchedVideoDetails ? (
                <>
                  <div className="videoDetailContent">
                    <img src={`https://img.youtube.com/vi/${fetchedVideoDetails.video_embed_url.split("/embed/")[1]}/maxresdefault.jpg`} alt="Video Thumbnail" className="videoThumbnail" />
                    <div className="videoInfo">
                      <Typography variant="h6" className="videoTitle">
                        {fetchedVideoDetails.video_details.uploader.title}
                      </Typography>
                      <div className="videoDescriptionContainer">
                        <Typography variant="body2" className="videoDescription">
                          {fetchedVideoDetails.video_details.uploader.description}
                        </Typography>
                      </div>
                    </div>
                  </div>

                  {/* Uploader info */}
                  <div className="uploaderInfo">
                    <img src={fetchedVideoDetails.video_details.uploader.photo} alt="Uploader Logo" className="uploaderLogo" />
                    <Typography variant="subtitle2" className="videoChannel">
                      <strong className="channelName">{fetchedVideoDetails.video_details.uploader.username}</strong>
                      {fetchedVideoDetails.video_details.uploader.verified && <img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" alt="Verified Badge" className="verifiedBadge" />} |{" "}
                      <span style={{ fontSize: "13px", color: "#909090" }}> {fetchedVideoDetails.video_details.uploader.subscriber_count}</span>{" "}
                    </Typography>
                  </div>
                </>
              ) : (
                <div className="videoSkeleton">
                  <div className="skeletonContent">
                    <div className="skeletonThumbnail" />
                    <div className="skeletonInfo">
                      <div className="skeletonLine" />
                      <div className="skeletonLine" />
                      <div className="skeletonLine" />
                      <div className="skeletonLine" />
                    </div>
                  </div>
                  <div className="skeletonUploaderInfo">
                    <div className="skeletonUploaderLogo" />
                    <div className="skeletonUploaderName" />
                  </div>
                  <Typography variant="body1" className="noVideoMessage">
                    No video available
                  </Typography>
                </div>
              )}
            </Paper>
          </div>
        </Grid>

        {loading && (
          <div className="loadingContainer">
            <div className="loadingSpinner"></div>
          </div>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <div className="commentKeywordPaper">
              <Typography variant="h6" className="commentKeywordTitle">
                Comment Keywords
              </Typography>
              {loading ? (
                <div className="loadingContainer">
                  <CircularProgress />
                  <Typography variant="body1" className="loadingText">
                    Loading comment keywords...
                  </Typography>
                </div>
              ) : keywords.length > 0 ? (
                <div className="commentKeywordContainer">
                  {keywords.map((keyword, index) => (
                    <Chip key={index} label={keyword} className="commentChip" />
                  ))}
                </div>
              ) : (
                <div className="noKeywordContainer">
                  <div className="skeletonKeywords">
                    <div className="skeletonBox" />
                    <div className="skeletonBox" />
                    <div className="skeletonBox" />
                  </div>
                  <Typography variant="body2" className="noKeywordMessage">
                    No keywords found for the comments.
                  </Typography>
                </div>
              )}
            </div>
          </Grid>

          {/* Sentiment Analytic Section */}
          <Grid item xs={12} md={6}>
            <div className="sentimentPaper">
              <Typography variant="h6" className="sentimentTitle">
                Sentiment Analytic
              </Typography>

              {loading ? (
                <div className="loadingContainer1">
                  <CircularProgress />
                  <Typography variant="body1" className="loadingText">
                    Loading sentiment analytic...
                  </Typography>
                </div>
              ) : (
                <div>
                  <div className="sentimentContainer">
                    <div className="sentimentChart">
                      {sentimentData.datasets[0].data.some((value) => value > 0) ? (
                        <>
                          <Doughnut
                            data={sentimentData}
                            options={{
                              cutout: "70%",
                              responsive: true,
                              plugins: {
                                legend: {
                                  display: false,
                                },
                                tooltip: {
                                  callbacks: {
                                    label: (tooltipItem) => `${tooltipItem.label}: ${tooltipItem.raw}%`,
                                  },
                                },
                              },
                              animation: {
                                animateScale: true,
                                animateRotate: true,
                              },
                            }}
                          />
                          <div className="sentimentChartText">
                            <span className="totalComments">{totalComments}</span> <br />
                            <span className="sentimentsText">Sentiments</span>
                          </div>
                        </>
                      ) : (
                        <div className="noSentimentDataContainer">
                          <div className="noSentimentDataCircle" />
                          <Typography variant="body2" className="noSentimentMessage">
                            No sentiment data available.
                          </Typography>
                        </div>
                      )}
                    </div>

                    {showSentiment && (
                      <div className="sentimentDetails">
                        <div className="sentimentItem">
                          <div className="sentimentColorIndicator negativeColor" />
                          <span className="sentimentText">
                            Negative | <i>{sentimentData.datasets[0].data[2]} in total</i> | {totalComments > 0 ? ((sentimentData.datasets[0].data[2] / totalComments) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                        <div className="sentimentItem">
                          <div className="sentimentColorIndicator neutralColor" />
                          <span className="sentimentText">
                            Neutral | <i>{sentimentData.datasets[0].data[1]} in total</i> | {totalComments > 0 ? ((sentimentData.datasets[0].data[1] / totalComments) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                        <div className="sentimentItem">
                          <div className="sentimentColorIndicator positiveColor" />
                          <span className="sentimentText">
                            Positive | <i>{sentimentData.datasets[0].data[0]} in total</i> | {totalComments > 0 ? ((sentimentData.datasets[0].data[0] / totalComments) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Grid>
        </Grid>

        {/* Table Comment Section */}
        <Grid item xs={12}>
          <Typography variant="h6" className="extractedCommentTitle">
            Extracted Comment <i className="totalCommentsCount">({totalComments})</i>
          </Typography>
          {loading && <div></div>}
          {renderPollingStatus()}
          <div elevation={3} className="commentTablePaper">
            {loading ? (
              <div className="loadingComments">
                <CircularProgress />
                Loading comments...
              </div>
            ) : (
              <>
                {/* Hanya tampilkan elemen berikut setelah tombol 'Extract Comment' diklik */}
                {totalComments > 0 && (
                  <>
                    <div className="searchContainer">
                      <img className="searchIcon" src="./search.png" alt="search icon" />
                      <input type="text" className="searchInput" placeholder="Search comment..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />

                      <img className="calendarIcon" src="./date.png" alt="calendar icon" onClick={toggleDatePicker} />

                      {isDatePickerVisible && (
                        <div className="datePickerContainer" ref={datePickerRef}>
                          <DatePicker selected={selectedDate} onChange={handleDateChange} inline />
                        </div>
                      )}

                      <button className="btnDownload" onClick={downloadCSV}>
                        <img className="downloadIcon" src="./download.png" alt="download icon" />
                      </button>

                      <select className="customSelect" value={selectedSentiment} onChange={handleSentimentChange}>
                        <option value="All sentiment">All sentiment</option>
                        <option value="positive">Positive</option>
                        <option value="neutral">Neutral</option>
                        <option value="negative">Negative</option>
                      </select>
                    </div>

                    <TableContainer className="tableContainer">
                      <Table stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell className="tableHeader" onClick={() => requestSort("index")}>
                              No {getIndicator("index")}
                            </TableCell>
                            <TableCell className="tableHeader" onClick={() => requestSort("author")}>
                              User {getIndicator("author")}
                            </TableCell>
                            <TableCell className="tableHeader" onClick={() => requestSort("comment_id")}>
                              Comment ID {getIndicator("comment_id")}
                            </TableCell>
                            <TableCell className="tableHeader" onClick={() => requestSort("text")}>
                              Comment content {getIndicator("text")}
                            </TableCell>
                            <TableCell className="tableHeader" onClick={() => requestSort("time_formatted")}>
                              Comment at {getIndicator("time_formatted")}
                            </TableCell>
                            <TableCell className="tableHeader" onClick={() => requestSort("keywords")}>
                              Comment keyword {getIndicator("keywords")}
                            </TableCell>
                            <TableCell className="tableHeader" onClick={() => requestSort("sentiment_label")}>
                              Sentiment {getIndicator("sentiment_label")}
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedCommentsToDisplay.length > 0 ? (
                            sortedCommentsToDisplay.map((comment, index) => (
                              <TableRow key={index}>
                                <TableCell>{indexOfFirstComment + index + 1}</TableCell>
                                <TableCell>{comment.author}</TableCell>
                                <TableCell>
                                  <span className="commentId">{comment.comment_id}</span>
                                </TableCell>
                                <TableCell>{comment.text}</TableCell>
                                <TableCell>{comment.time_formatted}</TableCell>
                                <TableCell>
                                  {comment.keywords && Array.isArray(comment.keywords) && comment.keywords.length > 0
                                    ? comment.keywords.map((keyword, idx) => (
                                        <span className="keywordBadge" key={idx}>
                                          {keyword}
                                        </span>
                                      ))
                                    : "no keyword detected"}
                                </TableCell>
                                <TableCell>
                                  <span className={`sentimentLabel ${comment.sentiment_label}`}>{comment.sentiment_label.charAt(0).toUpperCase() + comment.sentiment_label.slice(1)}</span>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} align="center" className="noComments">
                                No comments available
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <div className="pagination-info">
                      <span className="pagination-count" style={{ color: "red" }}>
                        {commentsToDisplay.length}
                      </span>{" "}
                      of {totalPages} results | Go to page:
                      <Select value={currentPage} onChange={(e) => handlePageChange(e, e.target.value)} className="pagination-select">
                        {Array.from({ length: totalPages }, (_, index) => (
                          <MenuItem key={index + 1} value={index + 1} style={{ fontSize: "13px" }}>
                            {index + 1}
                          </MenuItem>
                        ))}
                      </Select>
                    </div>

                    <Grid item xs={12}>
                      {loading ? <CircularProgress size={20} /> : <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} color="primary" className="pagination" />}
                    </Grid>
                  </>
                )}
              </>
            )}
          </div>
        </Grid>
      </Grid>
    </>
  );
}

export default App;
