document.addEventListener('DOMContentLoaded', () => {
    const quizModeBtn = document.getElementById('quiz-mode');
    const studyModeBtn = document.getElementById('study-mode');
    const quizSection = document.getElementById('quiz-section');
    const studySection = document.getElementById('study-section');
    const quizContainer = document.getElementById('quiz-container');
    const nextQuestionBtn = document.getElementById('next-question');
    const quizFeedback = document.getElementById('quiz-feedback');
    const quizScore = document.getElementById('quiz-score');
    
    let currentQuestionIndex = 0;
    let score = 0;
    let quizFlashcards = [];

    // Switch to Quiz Mode
    quizModeBtn.addEventListener('click', () => {
        quizSection.style.display = 'block';
        studySection.style.display = 'none';
        fetchQuiz();
    });

    // Switch to Study Mode
    studyModeBtn.addEventListener('click', () => {
        quizSection.style.display = 'none';
        studySection.style.display = 'block';
        fetchStudyCards();
    });

    // Fetch random flashcards for Quiz Mode
    function fetchQuiz() {
        fetch('/api/quiz')
            .then(response => response.json())
            .then(data => {
                quizFlashcards = data;
                currentQuestionIndex = 0;
                score = 0;
                quizScore.textContent = `Score: ${score}`;
                showQuestion();
            });
    }

    // Show the current question in Quiz Mode
    function showQuestion() {
        const currentCard = quizFlashcards[currentQuestionIndex];
        quizContainer.innerHTML = `
            <h3>Question: ${currentCard.question}</h3>
            <input type="text" id="user-answer" placeholder="Your answer">
        `;
        quizFeedback.textContent = '';  // Clear feedback
    }

    // Handle the answer check
    nextQuestionBtn.addEventListener('click', () => {
        const userAnswer = document.getElementById('user-answer').value.trim();
        const correctAnswer = quizFlashcards[currentQuestionIndex].answer;

        if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
            score++;
            quizFeedback.textContent = 'Correct!';
        } else {
            quizFeedback.textContent = `Incorrect! The correct answer was: ${correctAnswer}`;
        }

        currentQuestionIndex++;
        if (currentQuestionIndex < quizFlashcards.length) {
            showQuestion();
        } else {
            quizScore.textContent = `Final Score: ${score}`;
            nextQuestionBtn.disabled = true;  // Disable the button after quiz completion
        }
    });

    // Fetch all flashcards for Study Mode
    function fetchStudyCards() {
        fetch('/api/study')
            .then(response => response.json())
            .then(data => {
                const studyContainer = document.getElementById('study-container');
                studyContainer.innerHTML = '';  // Clear the study section
                data.forEach(card => {
                    const cardElement = document.createElement('div');
                    cardElement.innerHTML = `
                        <h4>${card.question}</h4>
                        <p><strong>Answer:</strong> ${card.answer}</p>
                    `;
                    studyContainer.appendChild(cardElement);
                });
            });
    }

    // Add new flashcard
    document.getElementById('flashcard-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const question = document.getElementById('question').value;
        const answer = document.getElementById('answer').value;

        fetch('/api/flashcards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question, answer })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            window.location.reload();
        });
    });
});
