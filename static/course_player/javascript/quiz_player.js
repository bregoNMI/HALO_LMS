document.addEventListener("DOMContentLoaded", function () {
  updateReferencesButton();


  const submitButtons = document.querySelectorAll(".submit-question-btn");
  let totalQuestions = document.querySelectorAll(".quiz-question").length;
  let answeredQuestions = 0;
  let correctAnswers = 0;



  submitButtons.forEach(button => {
    button.addEventListener("click", function () {
      if (this.disabled) return;

      const questionId = this.dataset.questionId;
      const questionType = this.dataset.questionType;
      const selected = document.querySelector(`input[name='question_${questionId}']:checked`);

      if (!selected) {
        alert("Please select an answer before submitting.");
        return;
      }

      const selectedValue = selected.value;

      console.log(`Submitting answer for Q${questionId}: ${selectedValue}`);

      fetch(window.submitQuestionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({
          lesson_id: window.lessonId,
          question_id: questionId,
          answer: selectedValue,
          question_type: questionType
        }),
      })
      .then(res => res.json())
      .then(data => {
        this.disabled = true;
        console.log("✅ Answer submited", data);

       // Get the parent question <li>
        const questionEl = this.closest(".quiz-question");
        let feedbackEl = questionEl.querySelector(".question-feedback");

        // If feedback doesn't exist, create it
        if (!feedbackEl) {
          feedbackEl = document.createElement("div");
          feedbackEl.className = "question-feedback";
          questionEl.appendChild(feedbackEl);
        }

        // Only show feedback if revealAnswers is true
        if (window.revealAnswers === true) {
          if (data.is_correct === true) {
            feedbackEl.innerHTML = `<p class="correct-feedback">✔ Correct!</p>`;
          } else if (data.is_correct === false) {
            feedbackEl.innerHTML = `<p class="incorrect-feedback">✘ Incorrect. Correct answer: ${data.correct_answers.join(", ")}</p>`;
          } else {
            feedbackEl.innerHTML = `<p class="neutral-feedback">✔ Answer submitted.</p>`;
          }
        }

      })
      .catch(err => {
        console.error("❌ Failed to submit answer", err);
        alert("Failed to submit answer. Try again.");
      });
    });
  });

  function getCookie(name) {
    const cookieValue = document.cookie
      .split("; ")
      .find(row => row.startsWith(name + "="));
    return cookieValue ? decodeURIComponent(cookieValue.split("=")[1]) : "";
  }

    let currentIndex = 0;
    const questions = document.querySelectorAll(".quiz-question");
    const nextButton = document.getElementById("nextQuestionBtn");

    if (nextButton && questions.length > 0) {
      function showNextQuestion() {
      const questions = document.querySelectorAll(".quiz-question");

      questions[currentIndex].style.display = "none";
      currentIndex++;

      if (currentIndex < questions.length) {
        questions[currentIndex].style.display = "block";

        // If we're now at the last question, change button text to "Finish"
        if (currentIndex === questions.length - 1 && nextButton) {
          nextButton.textContent = "Finish";
        }
        updateReferencesButton();


      } else {
        // No more questions left – fetch and show final score
        if (nextButton) {
          nextButton.disabled = true;
          nextButton.textContent = "Quiz Complete";
        }

        fetch(`/course_player/get-quiz-score/?session_id=${window.lessonSessionId}`)
          .then(res => res.json())
          .then(data => {
            const gradeContainer = document.createElement("div");
            gradeContainer.innerHTML = `
              <h4>Quiz Complete!</h4>
              <p>You got ${data.correct_answers} out of ${data.total_answered} correct.</p>
              <p>Your Score: ${data.score_percent}%</p>
            `;

            if (data.pending_review === true) {
              gradeContainer.innerHTML += `<div class="quiz-pending">📝 This quiz contains open responses and is pending manual review.</div>`;
              console.log("⏳ Quiz pending manual review – not marked complete.");
            } else if (data.passed) {
              gradeContainer.innerHTML += `<div class="quiz-success">${data.success_text}</div>`;

              fetch("/course_player/mark-lesson-complete/", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-CSRFToken": getCookie("csrftoken"),
                },
                body: JSON.stringify({
                  lesson_id: window.lessonId,
                }),
              })
                .then(res => res.json())
                .then(data => {
                  console.log("✅ Lesson marked complete:", data);
                })
                .catch(err => {
                  console.error("❌ Failed to mark lesson complete:", err);
                });

            } else {
              gradeContainer.innerHTML += `<div class="quiz-fail">${data.fail_text}</div>`;
              console.log("⏳ Lesson not marked complete – quiz not passed");
            }

            gradeContainer.style.marginTop = "20px";
            document.querySelector(".question-navigation").appendChild(gradeContainer);
          })
          .catch(err => {
            console.error("Failed to fetch quiz score:", err);
            alert("Failed to load final score.");
          });
       }
    }

    nextButton.addEventListener("click", showNextQuestion);

    }
    const essayButtons = document.querySelectorAll(".submit-essay-btn");

    essayButtons.forEach(button => {
    button.addEventListener("click", function () {
        const questionId = this.dataset.questionId;
        const questionType = this.dataset.questionType;
        const textarea = document.querySelector(`textarea[name='question_${questionId}']`);
        const answerText = textarea ? textarea.value.trim() : "";

        if (!answerText) {
          alert("Please enter a response before submitting.");
          return;
        }

        console.log(`Submitting essay for Q${questionId}: ${answerText}`);

        fetch(window.submitQuestionUrl, {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": getCookie("csrftoken"),
          },
          body: JSON.stringify({
              lesson_id: window.lessonId,
              question_id: questionId,
              answer: answerText,
              question_type: questionType
          }),
        })
        .then(res => res.json())
        .then(data => {
          console.log("✅ Answer submitted", data);
          answeredQuestions++;
          // Get the parent question <li>
          const questionEl = this.closest(".quiz-question");
          let feedbackEl = questionEl.querySelector(".question-feedback");

          // If feedback doesn't exist, create it
          if (!feedbackEl) {
            feedbackEl = document.createElement("div");
            feedbackEl.className = "question-feedback";
            questionEl.appendChild(feedbackEl);
          }
          // Update feedback content
          // Show feedback only if revealAnswers is true
          if (window.revealAnswers === true) {
            if (data.is_correct === true) {
              feedbackEl.innerHTML = `<p class="correct-feedback">✔ Correct!</p>`;
            } else if (data.is_correct === false) {
              feedbackEl.innerHTML = `<p class="incorrect-feedback">✘ Incorrect. Correct answer: ${data.correct_answers.join(", ")}</p>`;
            } else {
              feedbackEl.innerHTML = `<p class="neutral-feedback">✔ Answer submitted.</p>`;
            }
          } else {
            // Skip showing answer; optionally hide the question or leave it for manual navigation
          }
        })
        .catch(err => {
          console.error("❌ Failed to submit essay answer", err);
          alert("Failed to submit essay answer.");
        });

        fetch(`/course_player/get-quiz-score/?session_id=${window.lessonSessionId}`)
          .then(res => res.json())
          .then(data => {
            const questionEl = button.closest(".quiz-question");
            let feedbackEl = questionEl.querySelector(".question-feedback");

            if (!feedbackEl) {
              feedbackEl = document.createElement("div");
              feedbackEl.className = "question-feedback";
              questionEl.appendChild(feedbackEl);
            }

            feedbackEl.innerHTML = `<p class="neutral-feedback">📝 Answer submitted and pending manual review.</p>`;

            console.log("⏳ Essay submitted – lesson not marked complete yet (pending manual review).");

            // Update lessonData and the sidebar if pending review
            const lesson = window.lessonData.find(l => l.id === window.lessonId);
            if (lesson) {
              lesson.pending_review = true;

              const sidebarItem = document.querySelector(`.lesson-item[data-lesson-id="${window.lessonId}"]`);
              if (sidebarItem) {
                const progressLabel = sidebarItem.querySelector(".lesson-progress");
                if (progressLabel) {
                  progressLabel.textContent = "Pending";
                  progressLabel.classList.add("pending-progress");
                }
              }
            }

          });
    });
  });

  const fitbButtons = document.querySelectorAll(".submit-fitb-btn");

  fitbButtons.forEach(button => {
    button.addEventListener("click", function () {
      const questionId = this.dataset.questionId;
      const questionType = this.dataset.questionType;
      const input = document.querySelector(`input[name='question_${questionId}']`);
      const answerText = input ? input.value.trim() : "";

      if (!answerText) {
        alert("Please enter your answer before submitting.");
        return;
      }

      console.log(`✏️ Submitting FITB for Q${questionId}: ${answerText}`);

      fetch(window.submitQuestionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({
          lesson_id: window.lessonId,
          question_id: questionId,
          answer: answerText,
          question_type: questionType
        }),
      })
      .then(res => res.json())
      .then(data => {
        console.log("✅ FITB submitted:", data);
        this.disabled = true;

        const questionEl = this.closest(".quiz-question");
        let feedbackEl = questionEl.querySelector(".question-feedback");

        if (!feedbackEl) {
          feedbackEl = document.createElement("div");
          feedbackEl.className = "question-feedback";
          questionEl.appendChild(feedbackEl);
        }

        if (window.revealAnswers === true) {
          if (data.is_correct === true) {
            feedbackEl.innerHTML = `<p class="correct-feedback">✔ Correct!</p>`;
          } else if (data.is_correct === false) {
            feedbackEl.innerHTML = `<p class="incorrect-feedback">✘ Incorrect. Correct answer: ${data.correct_answers.join(", ")}</p>`;
          } else {
            feedbackEl.innerHTML = `<p class="neutral-feedback">✔ Answer submitted.</p>`;
          }
        }
      })
      .catch(err => {
        console.error("❌ Failed to submit FITB answer", err);
        alert("Failed to submit answer. Try again.");
      });
    });
  });


  function updateReferencesButton() {
    const questions = document.querySelectorAll(".quiz-question");
    const referencesBtn = document.getElementById("toggleReferencesBtn");

    const current = [...questions].find(q => q.style.display !== "none");

    if (current && current.dataset.hasMedia === "true") {
      referencesBtn.style.display = "inline-flex"; // or "block" depending on layout
    } else {
      referencesBtn.style.display = "none";
    }
  }


});