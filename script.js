(function () {
	'use strict';

	var convertText = document.getElementById('convert_text');
	var startBtn = document.getElementById('click_to_convert');
	var clearBtn = document.getElementById('clear_text');
	var copyBtn = document.getElementById('copy_text');
	var statusEl = document.getElementById('status');
	var statusText = document.getElementById('status_text');
	var recordLabel = document.getElementById('record_label');
	var wordCount = document.getElementById('word_count');
	var charCount = document.getElementById('char_count');

	function setStatus(message, state) {
		statusEl.className = 'status' + (state ? ' ' + state : '');
		statusText.textContent = message;
	}

	function updateStats() {
		var text = convertText.value.trim();
		var words = text ? text.split(/\s+/).length : 0;
		wordCount.textContent = words + (words === 1 ? ' word' : ' words');
		charCount.textContent = convertText.value.length + ' characters';
	}

	convertText.addEventListener('input', updateStats);
	updateStats();

	var SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

	if (!SpeechRecognitionAPI) {
		startBtn.disabled = true;
		setStatus('Speech recognition is not supported in this browser. Please use Chrome or Edge.', 'error');
		return;
	}

	var recognition = new SpeechRecognitionAPI();
	var listening = false;
	var restartNeeded = false;
	var finalTranscript = '';

	recognition.continuous = true;
	recognition.interimResults = true;
	recognition.lang = navigator.language || 'en-US';

	function setListeningState(isListening) {
		listening = isListening;
		recordLabel.textContent = isListening ? 'Stop Listening' : 'Start Listening';
		startBtn.classList.toggle('recording', isListening);
	}

	recognition.addEventListener('start', function () {
		setListeningState(true);
		setStatus('Listening... speak now.', 'listening');
	});

	recognition.addEventListener('end', function () {
		if (restartNeeded) {
			restartNeeded = false;
			try {
				recognition.start();
			} catch (err) {
				setListeningState(false);
				setStatus('Could not restart microphone: ' + err.message, 'error');
			}
			return;
		}
		setListeningState(false);
		setStatus('Stopped. Press start to continue.', '');
	});

	recognition.addEventListener('error', function (event) {
		var messages = {
			'not-allowed': 'Microphone access blocked. Allow the microphone and try again.',
			'service-not-allowed': 'Speech recognition blocked. Check browser permissions.',
			'no-speech': 'No speech detected. Keep talking...',
			'audio-capture': 'No microphone found.',
			'network': 'Network error with the speech service.'
		};

		if (event.error === 'no-speech') {
			restartNeeded = true;
			return;
		}

		setListeningState(false);

		if (event.error === 'aborted') {
			setStatus('Stopped.', '');
			return;
		}

		setStatus(messages[event.error] || ('Error: ' + event.error), 'error');
	});

	recognition.addEventListener('result', function (event) {
		var interim = '';

		for (var i = event.resultIndex; i < event.results.length; i++) {
			var transcript = event.results[i][0].transcript;
			if (event.results[i].isFinal) {
				finalTranscript += transcript + ' ';
			} else {
				interim += transcript;
			}
		}

		convertText.value = (finalTranscript + interim).replace(/\s+$/, '');
		convertText.scrollTop = convertText.scrollHeight;
		updateStats();

		if (interim) {
			setStatus('Hearing: "' + interim + '"', 'live');
		}
	});

	startBtn.addEventListener('click', function () {
		if (listening) {
			restartNeeded = false;
			recognition.stop();
			return;
		}
		try {
			recognition.start();
		} catch (err) {
			setStatus('Could not start: ' + err.message, 'error');
		}
	});

	clearBtn.addEventListener('click', function () {
		finalTranscript = '';
		convertText.value = '';
		updateStats();
		convertText.focus();
	});

	copyBtn.addEventListener('click', function () {
		if (!convertText.value) return;
		convertText.select();
		document.execCommand('copy');
		var original = copyBtn.textContent;
		copyBtn.textContent = 'Copied!';
		setTimeout(function () { copyBtn.textContent = original; }, 1200);
	});
})();
