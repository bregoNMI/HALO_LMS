document.addEventListener('DOMContentLoaded', function () {
    const ctx = document.getElementById('activeLearnersGraph').getContext('2d');
    createLoginChart(ctx);
    updateDateFilter('Last 12 months');  // Load default data on page load

    const ctx1 = document.getElementById('timeSpentChart').getContext('2d');
    createTimeChart(ctx1);

    const ctx2 = document.getElementById('topCoursesChart').getContext('2d');
  createTopCoursesChart(ctx2);
});

function updateDateFilter(customSelect, dateRangeLabel) {
    fetch('/requests/learner-login-data/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: new URLSearchParams({
            'range': dateRangeLabel,  // e.g. 'Last 6 months'
        }),
    })
    .then(res => res.json())
    .then(data => {
        updateLoginChart(data, dateRangeLabel); // Your chart redraw function
    })
    .catch(err => {
        console.error('Failed to update chart:', err);
    });
}

function updateLoginChart(data, dateRangeLabel) {
    if (!loginChart) return;

    loginChart.data.labels = data.labels;     // e.g. ['Jan', 'Feb', 'Mar']
    loginChart.data.datasets[0].data = data.values;  // e.g. [12, 15, 9]
    loginChart.update();

    document.getElementById('activeLearnersFilter').innerText = dateRangeLabel || 'Last 12 months';
    document.getElementById('activeLearnersCounter').innerText = data.total_learners || 0;
}


let loginChart;  // Define globally
let timeSpentChart;

function createLoginChart(context) {
    loginChart = new Chart(context, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Active Learners',
                data: [],
                borderColor: '#8a2be2',
                backgroundColor: '#e5caff',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                mode: 'index',
                intersect: false
              }
            },
            scales: {
                x: {
                  ticks: {
                    color: '#858b8f'
                  },
                  grid: {
                    color: '#ececf1',
                    lineWidth: 0.7,
                    borderDash: [2, 4],
                    borderDashOffset: 0
                  },
                  border: {
                    color: '#ffffff'
                  }
                },
                y: {
                  ticks: {
                    color: '#858b8f'
                  },
                  grid: {
                    color: '#ececf1',
                    lineWidth: 0.7,
                    borderDash: [2, 4],
                    borderDashOffset: 0
                  },
                  border: {
                    color: '#ffffff'
                  }
                }
            }                                          
        }                    
    });
}

function createTimeChart(ctx) {
    timeSpentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeSpentLabels,
            datasets: [{
                label: 'Learning Time',
                data: timeSpentData,
                borderColor: '#4caf50',
                backgroundColor: '#c8facc',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            const seconds = context.raw;
                            const minutes = Math.floor(seconds / 60);
                            const hours = Math.floor(minutes / 60);
                            const remainderMinutes = minutes % 60;

                            if (minutes < 60) {
                                return `Learning Time: ${minutes} min`;
                            } else {
                                return `Learning Time: ${hours}h ${remainderMinutes}m`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { display: false },
                    grid: { display: false, drawTicks: false, drawBorder: false },
                    border: { display: false }
                },
                y: {
                    ticks: {
                        display: false
                    },
                    grid: {
                        display: false,
                        drawTicks: false,
                        drawBorder: false
                    },
                    border: { display: false },
                    beginAtZero: true
                }
            }
        }
    });
}

function createTopCoursesChart(ctx) {
    const total = topCourseData.reduce((sum, val) => sum + val, 0);
  
    // Optional: use the same colors as the chart
    const colors = ['#6366f1', '#3bc3b8', '#f59e0b', '#e7382d', '#3b82f6'];
  
    // Build custom label HTML
    const labelContainer = document.getElementById('customTopCoursesLabels');
    labelContainer.innerHTML = ''; // Clear existing
  
    topCourseLabels.forEach((label, index) => {
      const value = topCourseData[index];
      const percent = ((value / total) * 100).toFixed(1);
      
      labelContainer.innerHTML += `
        <div class="custom-label-row" style="display: flex; align-items: center;">
          <div class="custom-label-left" style="background-color: ${colors[index]};"></div>
          <div class="custom-label-right"><span>${label} </span><span class="custom-label-percent">${percent}%</span></div>
        </div>
      `;
    });
  
    // Create chart
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: topCourseLabels,
        datasets: [{
          label: 'Enrollments',
          data: topCourseData,
          backgroundColor: colors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }, // hide default legend
          tooltip: {
            callbacks: {
              label: function (context) {
                const percent = ((context.raw / total) * 100).toFixed(1);
                return `${context.label}: ${context.raw} (${percent}%)`;
              }
            }
          }
        }
      }
    });
}
  
  

// Helper function to get CSRF token from cookies
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}