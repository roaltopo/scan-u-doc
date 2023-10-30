/*/ Not change any values of the variables below, 
use the "json/config.json" file to make your settings. /*/
let data_index = "";
let prompts_name = "";
let prompts_expert = "";
let prompts_image = "";
let prompts_background_color = "";
let prompts_training = "";
let chat_font_size = "";
let API_URL = "";
let source = "";
let google_voice = "";
let google_voice_lang_code = "";
let microphone_speak_lang = "";

let chat_minlength = 0;
let chat_maxlength = 0;
let lang_index = 0;
let scrollPosition = 0;

let is_model_turbo = false;
let use_text_stream = false;
let display_microphone_in_chat = false;
let display_avatar_in_chat = false;
let display_contacts_user_list = false;
let display_copy_text_button_in_chat = false;
let filter_badwords = true;
let display_audio_button_answers = true;
let chat_history = true;
let hasBadWord = false;

let chat = [];
let pmt = [];
let array_widgets = [];
let array_chat = [];
let lang = [];
let = badWords = []
let array_messages = [];
let array_voices = [];
let filterBotWords = ["Robot:", "Bot:"];
//---- end configs----//

//Modify the option below according to the prompt you want to use.
let user_prompt_lang = "en";

let textModal;
let fileModal;
let uuid = '';
let chatId;
let recognition;

if (window.location.protocol === 'file:') {
	alert('This file is not runnable locally, an http server is required, please read the documentation.');
}

//Loads the characters from the config.json file and appends them to the initial slider
loadData("json/config.json", ["json/prompts-" + user_prompt_lang + ".json", "json/lang.json", "json/badwords.json"]);

function loadData(url, urls) {
	// Fetch data from the given url and an array of urls using Promise.all and map functions
	return Promise.all([fetch(url).then(res => res.json()), ...urls.map(url => fetch(url).then(res => res.json()))])
		.then(([out, OutC, OutL, OutB, OutT]) => {
			// Extract necessary data from the response
			lang = OutL;
			if (filter_badwords) { badWords = OutB.badwords.split(',') }
			lang_index = lang.use_lang_index;
			use_text_stream = out.use_text_stream;
			display_avatar_in_chat = out.display_avatar_in_chat;
			display_microphone_in_chat = out.display_microphone_in_chat;
			microphone_speak_lang = out.microphone_speak_lang;
			google_voice = out.google_voice;
			google_voice_lang_code = out.google_voice_lang_code;
			display_contacts_user_list = out.display_contacts_user_list;
			display_copy_text_button_in_chat = out.display_copy_text_button_in_chat;
			display_audio_button_answers = out.display_audio_button_answers;
			filter_badwords = out.filter_badwords;
			chat_history = out.chat_history;
			chat_font_size = out.chat_font_size;

			loadSpeechRecognition();

			copy_text_in_chat = display_copy_text_button_in_chat ? `<button class="copy-text" onclick="copyText(this)"><svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg> <span class="label-copy-code">${lang["translate"][lang_index].copy_text1}</span></button>` : '';
			var s = document.createElement('style'); s.innerHTML = '.message-text{font-size:' + chat_font_size + ' !important;}'; document.head.appendChild(s);

			if (!display_contacts_user_list) {
				$(".toggle_employees_list").hide();
				$(".col-contacts-border").hide();
			}

			if (display_microphone_in_chat) {
				$("#microphone-button").show()
			}
			// Populate array_widgets with character data and create HTML elements for each character card
			$("#load-character").html("");
			$(".ai-contacts-scroll").html("");
			for (var i = 0; i < OutC.length; i++) {
				array_widgets.push({
					'id': OutC[i]['id'],
					'name': OutC[i]['name'],
					'widget_name': OutC[i]['widget_name'],
					'image': OutC[i]['image'],
					'welcome_message': OutC[i]['welcome_message'],
					'display_welcome_message': OutC[i]['display_welcome_message'],
					'training': OutC[i]['training'],
					'description': OutC[i]['description'],
					'chat_minlength': OutC[i]['chat_minlength'],
					'chat_maxlength': OutC[i]['chat_maxlength'],
					'max_num_chats_api': OutC[i]['max_num_chats_api']
				})

				$("#load-character").append(`

          <div class="card-option start-chat" data-index="${i}">
            <div class="card-option-img"><img src="${array_widgets[i]['image']}" alt="${array_widgets[i]['widget_name']}" title="${array_widgets[i]['widget_name']}"></div>
            <div class="card-option-title"><h5>${array_widgets[i]['widget_name']}</h5></div>
          </div>
        `)
			}

			// Get chat history and update the last_chat property for each character
			if (chat_history) {
				arr2 = JSON.parse(localStorage.getItem("oracle_chat_v1"));

				array_widgets.forEach((item1) => {
					const item2 = (arr2 && arr2.find((item2) => item2.id === item1.id));
					if (item2) {
						item1.last_chat = item2.last_chat;
					}
				});
			}
			translate();
			$("#loading").fadeOut();


		}).catch(err => { throw err })
}

function currentDate() {
	const timestamp = new Date();
	return timestamp.toLocaleString();
}


// Define a placeholder for the image
const placeholder = "img/placeholder.svg";

// Check if the image is in the visible area
$(window).on("scroll", function () {
	$("img[data-src]").each(function () {
		if (isElementInViewport($(this))) {
			$(this).attr("src", $(this).attr("data-src"));
			$(this).removeAttr("data-src");
		}
	});
});

// Helper function to check if the element is in the visible area
function isElementInViewport(el) {
	const rect = el.get(0).getBoundingClientRect();
	return (
		rect.bottom >= 0 &&
		rect.right >= 0 &&
		rect.top <= $(window).height() &&
		rect.left <= $(window).width()
	);
}

//Main function of GPT-3 chat API
async function getResponse(prompt) {

	//Conversation history
	array_chat.push({ "name": "User", "message": prompt, "isImg": false, "date": currentDate() })
	array_messages = [];

	//Converting chat to turbo API model
	for (let i = 0; i < array_chat.length; i++) {
		let message = { "role": "", "content": "" };

		if (array_chat[i].training === true) {
			let system_message = { "role": "system", "content": array_chat[i].message };
			array_messages.push(system_message);
		} else {
			if (array_chat[i].name === "User") {
				message.role = "user";
			} else {
				message.role = "assistant";
			}
			message.content = array_chat[i].message;
			array_messages.push(message);
		}
	}

	if (array_messages.length > max_num_chats_api) {
		var slice_messages = max_num_chats_api - 2;
		array_messages = array_messages.slice(0, 2).concat(array_messages.slice(-slice_messages));
	}
	/*
	const params = new URLSearchParams();
	params.append('array_chat', JSON.stringify(array_messages));
	params.append('prompts_name', prompts_name);
	*/

	try {
		let question = array_messages[array_messages.length - 1].content;
		// Datos a enviar al servidor
		var questionData = {
			question: question
		};

		//console.log(message);
		const fullPrompt = "That is a responses' example maded in English to test capacities of that chat";
		const randomID = generateUniqueID();
		$("#overflow-chat").append(`

        <div class="conversation-thread thread-ai">
          ${avatar_in_chat}
          <div class="message-container">
            <div class="message-info">
						${copy_text_in_chat}
						${audio_in_chat}            
              <div class="user-name"><h5>${prompts_name}</h5></div>
              <div class="message-text">
                <div class="chat-response ${randomID}"><span class='get-stream'></span><span class='cursor'></span></div>
              </div>
              <div class="date-chat"><img src="img/icon-clock.svg"> ${currentDate()}</div>
            </div>
          </div>
        </div>
			`);

		//$(`.${randomID}`).append(fullPrompt);
		//scrollChatBottom();
		//OK

		// Realiza una llamada POST al endpoint /answer_question
		$.ajax({
			type: "POST",
			url: `/answer_question/${uuid}`,
			data: JSON.stringify(questionData),
			contentType: "application/json",
			success: function (data) {
				// La respuesta se encuentra en data.response
				var response = data.answer;
				//console.log(data, response);

				$(".cursor").remove();
				str = $(`.${randomID}`).html();
				str = escapeHtml(str);
				$(`.${randomID}`).html(str);
				$(`.chat_${randomID} .chat-audio`).fadeIn('slow');
				enableChat();
				scrollChatBottom();

				//if(!use_text_stream){
				$(`.${randomID}`).append(response);
				scrollChatBottom();
				//}

				array_chat.push({ "name": prompts_name, "message": response, "date": currentDate() });
				checkClearChatDisplay();
				saveChatHistory();
				//enableChat();
			}
		});


		$(`.chat_${randomID} .chat-audio`).hide();
		scrollChatBottom();
	} catch (e) {
		console.error(`Error creating SSE: ${e}`);
	}
}

function generateUniqueID(prefix = 'id_') {
	const timestamp = Date.now();
	return `${prefix}${timestamp}`;
}

function streamChat(source, randomID) {
	let fullPrompt = "";
	let partPrompt = "";
	source.addEventListener('message', function (e) {
		//console.log(e.data);
		let data = e.data;
		let tokens = {};

		if (typeof data === 'string') {
			if (data.startsWith('[ERROR]')) {
				let message = data.substr('[ERROR]'.length).trim();
				toastr.error(message);
				enableChat();
				return;
			} else if (data === '[DONE]') {
				$(".cursor").remove();
				str = $(`.${randomID}`).html();
				str = escapeHtml(str);
				$(`.${randomID}`).html(str);
				$(`.chat_${randomID} .chat-audio`).fadeIn('slow');
				enableChat();
				scrollChatBottom();

				if (!use_text_stream) {
					$(`.${randomID}`).append(fullPrompt);
					scrollChatBottom();
				}

				array_chat.push({ "name": prompts_name, "message": fullPrompt, "date": currentDate() });
				checkClearChatDisplay();
				saveChatHistory();

				return false;
			} else {
				try {
					tokens = JSON.parse(data);
				} catch (err) {

					if (typeof data === "string") {
						toastr.error("❌ " + data)
						enableChat();
						return false;
					}

				}
			}
		}

		if (!tokens || !tokens.choices || tokens.choices.length === 0) {
			toastr.error("❌ " + tokens.message)
			enableChat();
			$(`.chat_${randomID}`).remove();
			return;
		}

		var choice = tokens.choices[0]; //is_model_turbo ? tokens.choices[0].delta : tokens.choices[0];
		partPrompt = "";
		if (choice.content || choice.text) {
			fullPrompt += choice.content || choice.text;
			partPrompt = choice.content || choice.text;
		}
		console.log('partPrompt:', partPrompt);

		if (use_text_stream) {
			$(`.${randomID} .get-stream`).append(partPrompt);
			if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
				scrollChatBottom();
			}
		}
	});
}


function saveChatHistory() {
	/*
	if (array_widgets[data_index]) {
		array_widgets[data_index].last_chat = array_chat;
	}
	if(chat_history){
		localStorage.setItem("oracle_chat_v1", JSON.stringify(array_widgets));
	}			
	console.log("Saving...")
	*/
}

//Function that appends the AI response in the chat in html
function responseChat(response) {

	for (var i = 0; i < filterBotWords.length; i++) {
		if (response.indexOf(filterBotWords[i]) !== -1) {
			response = response.replace(filterBotWords[i], "");
		}
	}

	array_chat.push({ "name": prompts_name, "message": response, "date": currentDate() })
	response = escapeHtml(response)

	avatar_in_chat = "";
	if (display_avatar_in_chat === true) {
		avatar_in_chat = `<div class="user-image"><img src="img/robot-avatar.png" alt="${prompts_name}" title="${prompts_name}"></div>`;
	}

	audio_in_chat = "";
	if (display_audio_button_answers === true) {
		audio_in_chat = `<div class='chat-audio'><img data-play="false" src='img/btn_tts_play.svg'></div>`;
	}


	$("#overflow-chat").append(`
        <div class="conversation-thread thread-ai">
          ${avatar_in_chat}
          <div class="message-container">
            <div class="message-info">
						${copy_text_in_chat}
						${audio_in_chat}            
              <div class="user-name"><h5>${prompts_name}</h5></div>
              <div class="message-text">
                <div class="chat-response">${response}</div>
                <div class="date-chat"><img src="img/icon-clock.svg"> ${currentDate()}</div>
              </div>
            </div>
          </div>
        </div>
			`);
	scrollChatBottom();
	enableChat();
	saveChatHistory();
	checkClearChatDisplay();
}

function appendChatImg(chat) {
	const imageID = Date.now();
	IAimagePrompt = chat.replace("/img ", "");

	$("#overflow-chat").append(`

        <div class="conversation-thread thread-ai">
          <div class="message-container">
            <div class="message-info">   
              <div class="user-name"><h5>${prompts_name}</h5></div>
              <div class="message-text">
	              <div class="chat-response no-white-space">
	              <p>${lang["translate"][lang_index].creating_ia_image} <strong class='ia-image-prompt-label'>${IAimagePrompt}</strong>
                <div class="wrapper-image-ia image_ia_${imageID}">
	                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="40" height="40">
	                  <circle cx="50" cy="50" r="40" stroke="#c5c5c5" stroke-width="8" fill="none" />
	                  <circle cx="50" cy="50" r="40" stroke="#249ef7" stroke-width="8" fill="none" stroke-dasharray="250" stroke-dashoffset="0">
	                    <animate attributeName="stroke-dashoffset" dur="2s" repeatCount="indefinite" from="0" to="250" />
	                  </circle>
	                </svg>
                </div>
                <p class='expire-img-message'>${lang["translate"][lang_index].expire_img_message}</p>					              
	              </div>
              </div>
            </div>
              <div class='date-chat'><img src='img/icon-clock.svg'> ${currentDate()}</div>
          </div>
        </div>
			`);

	scrollChatBottom();
	$("#chat").val("");
}

//Function that sends the user's question to the chat in html and to the API
function sendUserChat() {
	let chat = $("#chat").val();

	if (filter_badwords) {
		// Create regex to check if word is forbidden
		const regex = new RegExp(`\\b(${badWords.join('|')})(?=\\s|$)`, 'gi');
		// Check if message contains a bad word
		const hasBadWord = regex.test(chat);
		// Replace bad words with asterisks
		if (hasBadWord) {
			const sanitizedMessage = chat.replace(regex, match => '*'.repeat(match.length));
			$("#chat").val(sanitizedMessage);
			toastr.error(`${lang["translate"][lang_index].badword_feedback}`);
			return false;
		}
	}

	//checks if the user has entered the minimum amount of characters
	if (chat.length < chat_minlength) {
		toastr.error(`${lang["translate"][lang_index].error_chat_minlength} ${chat_minlength} ${lang["translate"][lang_index].error_chat_minlength_part2}`);
		return false;
	}

	chat = escapeHtml(chat)

	avatar_in_chat = display_avatar_in_chat ? `<div class="user-image"><img onerror="this.src='img/no-image.svg'" src="img/robot-avatar.png" alt="${prompts_name}" title="${prompts_name}"></div>` : '';
	audio_in_chat = display_audio_button_answers ? `<div class='chat-audio'><img data-play="false" src='img/btn_tts_play.svg'></div>` : '';

	$("#overflow-chat").append(`
        <div class="conversation-thread thread-user">
          <div class="message-container">
            <div class="message-info">
						${copy_text_in_chat}
						${audio_in_chat}            
              <div class="user-name"><h5>${lang["translate"][lang_index].you}</h5></div>
              <div class="message-text"><div class="chat-response">${chat}</div></div>
              <div class="date-chat"><img src="img/icon-clock.svg"> ${currentDate()}</div>
            </div>
          </div>
        </div>
			`);

	scrollChatBottom();
	hljs.highlightAll();

	if (chat.includes("/img")) {
		appendChatImg(chat);
	} else {
		getResponse(chat);
	}

	$("#chat").val("");
	disableChat();
}

//Send message in chat by pressing enter
$("#chat").keypress(function (e) {
	if (e.which === 13 && !e.shiftKey) {
		sendUserChat();
		return false;
	}
});


$(".btn-send-chat").on("click", function () {
	sendUserChat();
})


// Function to shuffle the array
function shuffleArray(array) {
	return array.sort(() => Math.random() - 0.5);
}

function translate() {
	translationObj = lang.translate[lang_index];

	// Loop através de todas as chaves do objeto translationObj
	for (let key in translationObj) {
		// Obtenha o valor da chave atual
		let value = translationObj[key];

		// Encontre todos os elementos no HTML que contêm o bloco entre {{ e }}
		let elements = document.body.querySelectorAll('*:not(script):not(style)');
		elements.forEach(function (element) {
			for (let i = 0; i < element.childNodes.length; i++) {
				let node = element.childNodes[i];
				if (node.nodeType === Node.TEXT_NODE) {
					let text = node.nodeValue;
					let regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
					if (regex.test(text)) {
						// Use a propriedade innerHTML para interpretar as tags HTML
						node.parentElement.innerHTML = text.replace(regex, value);
					}
				} else if (node.nodeType === Node.ELEMENT_NODE) {
					// Para elementos com atributos HTML, substitua o valor da chave no atributo
					let attributes = node.attributes;
					for (let j = 0; j < attributes.length; j++) {
						let attribute = attributes[j];
						if (attribute.value.includes(`{{${key}}}`)) {
							let newValue = attribute.value.replace(`{{${key}}}`, value);
							node.setAttribute(attribute.name, newValue);
						}
					}
				}
			}
		});
	}
}

function closeChat() {
	hideChat();
	enableChat();
	$(window).scrollTop(scrollPosition);
	$(".cards-options, .select-option-title, #chat-background").show();
	$(".message-area-bottom, .ai-chat-top").hide();
	$("#body-frame").removeClass("body-frame-chat");
	$(".chat-frame").removeClass("chat-frame-talk");
	$(".hide-section").removeClass("hideOnMobile");
	$("body").removeClass("custom-body");
	$("#overflow-chat").hide();
	return false;
}

function stopChat() {
	if (source) {
		enableChat();
		source.close();
		$(".cursor").remove();
	}
}

$(".btn-cancel-chat").on("click", function () {
	stopChat();
})

document.addEventListener("keydown", function (event) {
	if (event.key === "Escape") {
		closeChat();
	}
});

function hideChat() {
	hideFeedback();
	cancelSpeechSynthesis();
	$(".hide-section").show();
	$("#chat-background").hide();
	if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
		$("#overflow-chat").hide();
	}

}

// Agrega el evento para el botón "Enviar"
$('#sendButton').click(function (evt) {
	evt.preventDefault();

	var textData = {
		text: $('#textArea').val(),
	};

	// Configurar la posición de Toastr en la parte superior
	toastr.options.positionClass = 'toast-top-center';

	// Verificar si la variable de texto está vacía
    if (textData.text.trim() === '') {
        toastr.error("Error: Text cannot be empty.");
        return;
    }

	// Deshabilitar el botón y agregar un spinner
    var sendButton = $('#sendButton');
    sendButton.prop('disabled', true);
    sendButton.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...');

	// Realiza una llamada POST al endpoint /store_text
	$.ajax({
		type: "POST",
		url: `/store_text/${uuid}`,
		data: JSON.stringify(textData),
		contentType: "application/json",
		success: function (data) {
			// Habilitar el botón nuevamente
            sendButton.prop('disabled', false);
            sendButton.html('Send');

			$('#textArea').val('');
			// Cierra el modal después de enviar el texto
			textModal.hide();
			displayChat(chatId);
		},
        error: function (xhr, status, error) {
            // Verificar si hay un código de error del backend
            if (xhr.status === 400 || xhr.status === 500) {
                toastr.error(`Error: ${xhr.status} - ${error}`);
            } else {
                toastr.error("Error: Connection refused. Please try again later.");
            }

            // Habilitar el botón nuevamente
            sendButton.prop('disabled', false);
            sendButton.html('Send');
        }
	});
});

$('#sendButton2').click(function (evt) {
    evt.preventDefault();
    var formData = new FormData($('#file-form')[0]);
    var sendButton = $('#sendButton2');

    // Configurar la posición de Toastr en la parte superior
    toastr.options.positionClass = 'toast-top-center';

    var fileInput = $('#fileInput')[0];
    var fileSize = fileInput.files[0].size; // Tamaño en bytes
    var maxSize = 1*1024*1024; // 1MB en bytes

    // Validar el tamaño del archivo
    if (fileSize > maxSize) {
        toastr.error('Error: File size exceeds 1MB limit.');
        return;
    }

    // Deshabilitar el botón y agregar un spinner
    sendButton.prop('disabled', true);
    sendButton.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...');

    $.ajax({
        url: `/upload_file/${uuid}`,
        type: 'POST',
        data: formData,
        async: false,
        cache: false,
        contentType: false,
        processData: false,
        success: function (data) {
            $('#fileInput').val('');
            // Habilitar el botón nuevamente
            sendButton.prop('disabled', false);
            sendButton.html('Send');

            // Cierra el modal después de enviar el texto
            textModal.hide();
            displayChat(chatId);
        },
        error: function (xhr, status, error) {
            // Mostrar mensaje de error con Toastr
            toastr.error('Error uploading the file');

            // Habilitar el botón nuevamente
            sendButton.prop('disabled', false);
            sendButton.html('Send');
        }
    });
});


$('#sendButton3').click(function () {
    var textData = {
        html_url: $('#url').val(),
    };

	// Configurar la posición de Toastr en la parte superior
	toastr.options.positionClass = 'toast-top-center';

    var sendButton = $('#sendButton3');

    // Verificar si la variable de texto está vacía
    if (textData.html_url.trim() === '') {
        toastr.error("Error: URL cannot be empty.");
        return;
    }

	// Validar la URL
    var urlRegex = new RegExp('^(https?:\\/\\/)?'+ 
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ 
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ 
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ 
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ 
    '(\\#[-a-z\\d_]*)?$','i');
    if (!urlRegex.test(textData.html_url)) {
        toastr.error("Error: Invalid URL.");
        return;
    }

    // Deshabilitar el botón y agregar un spinner
    sendButton.prop('disabled', true);
    sendButton.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...');

    // Realiza una llamada POST al endpoint /store_text
    $.ajax({
        type: "POST",
        url: `/store_text/${uuid}`,
        data: JSON.stringify(textData),
        contentType: "application/json",
        success: function (data) {
            $('#url').val('');
			// Habilitar el botón nuevamente
            sendButton.prop('disabled', false);
            sendButton.html('Send');
			
            // Cierra el modal después de enviar el texto
            textModal.hide();
            displayChat(chatId);
        },
        error: function (xhr, status, error) {
            if (xhr.status === 0) {
                toastr.error('Error: Connection refused. Please try again later.');
            } else if (xhr.status === 400 || xhr.status === 500) {
                toastr.error(`Error: ${xhr.status} - ${error}`);
            }

            // Habilitar el botón nuevamente
            sendButton.prop('disabled', false);
            sendButton.html('Send');
        }
    });
});




$(document).delegate(".start-chat", "click", function () {
	chatId = $(this).attr("data-index");
	if (chatId == 0) {
		textModal = new bootstrap.Modal(document.getElementById('modalText'), {
			keyboard: false
		});
		textModal.show();
	} else if (chatId == 1) {
		textModal = new bootstrap.Modal(document.getElementById('modalFile'), {
			keyboard: false
		});
		textModal.show();
	} else if (chatId == 2) {
		textModal = new bootstrap.Modal(document.getElementById('modalUrl'), {
			keyboard: false
		});
		textModal.show();
	}
	//console.log(chatId);
	//displayChat($(this).attr("data-index"));
})

function displayChat(index) {
	data_index = index;
	cancelSpeechSynthesis();
	$(".hide-section").addClass("hideOnMobile");
	$(".chat-frame").addClass("chat-frame-talk");
	stopChat();
	scrollPosition = $(this).scrollTop();
	array_messages = [];
	$("#overflow-chat").html("");
	$("#overflow-chat").show();
	$("#body-frame").addClass("body-frame-chat");
	array_chat = [];
	prompts_name = array_widgets[data_index]['name'];
	prompts_widget_name = array_widgets[data_index]['widget_name'];
	prompts_expert = array_widgets[data_index]['expert'];
	prompts_image = array_widgets[data_index]['image'];
	prompts_background_color = array_widgets[data_index]['background_thumb_color'];
	prompts_training = array_widgets[data_index]['training'];
	displayWelcomeMessage = array_widgets[data_index]['display_welcome_message'];
	welcome_message = array_widgets[data_index]['welcome_message'];
	chat_minlength = array_widgets[data_index]['chat_minlength'];
	chat_maxlength = array_widgets[data_index]['chat_maxlength'];
	max_num_chats_api = array_widgets[data_index]['max_num_chats_api'];
	lastChatLength = (array_widgets[data_index] && array_widgets[data_index]['last_chat']) ? array_widgets[data_index]['last_chat'].length : [];
	$(".ai-chat-top-job").html(prompts_widget_name)
	$(".cards-options, .select-option-title").hide();
	$("#chat").val("");
	// Set the maxlength attribute of the chat element to the value of chat_maxlength
	$("#chat").attr("maxlength", chat_maxlength);


	$(".message-area-bottom, .ai-chat-top").show();
	if (lastChatLength > 2) {
		loadChat();
	} else {
		const chat = { "name": prompts_name, "message": prompts_training, "training": true, "date": currentDate() };
		array_chat.push(chat);
		if (displayWelcomeMessage) {
			responseChat(array_widgets[data_index]['welcome_message']);
		}
	}

	setTimeout(function () {
		enableChat();
	}, 100);

	$("body").addClass("custom-body");
	translate();
}


const escapeHtml = (str) => {

	// Check if the string contains <code> or <pre> tags
	if (/<code>|<\/code>|<pre>|<\/pre>/g.test(str)) {
		// Returns the string without replacing the characters inside the tags
		return str;
	}

	// Replaces special characters with their respective HTML codes
	str = str.replace(/[&<>"'`{}()\[\]]/g, (match) => {
		switch (match) {

			case '<': return '&lt;';
			case '>': return '&gt;';
			case '{': return '&#123;';
			case '}': return '&#125;';
			case '(': return '&#40;';
			case ')': return '&#41;';
			case '[': return '&#91;';
			case ']': return '&#93;';
			default: return match;
		}
	});


	// Remove the stream &lt;span class="get-stream"&gt;
	str = str.replace(/&lt;span\s+class="get-stream"&gt;/g, "");

	// Remove the closing tag </span>
	str = str.replace(/&lt;\/span&gt;/g, "");

	// Replaces the ```code``` snippet with <pre><code>code</code></pre>
	str = str.replace(/```(\w+)?([\s\S]*?)```/g, '<pre><code>$2</code><button class="copy-code" onclick="copyCode(this)"><svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg> <span class="label-copy-code">' + lang["translate"][lang_index].copy_code1 + '</span></button></pre>').replace(/(\d+\.\s)/g, "<strong>$1</strong>").replace(/(^[A-Za-z\s]+:)/gm, "<strong>$1</strong>");


	return str;
};

// function to copy the text content
function copyText(button) {
	const div = button.parentElement;
	const code = div.querySelector('.chat-response');
	const range = document.createRange();
	range.selectNode(code);
	window.getSelection().removeAllRanges();
	window.getSelection().addRange(range);
	document.execCommand("copy");
	window.getSelection().removeAllRanges();
	button.innerHTML = lang["translate"][lang_index].copy_text2;
}

// Function to copy the content of the <pre> tag
function copyCode(button) {
	const pre = button.parentElement;
	const code = pre.querySelector('code');
	const range = document.createRange();
	range.selectNode(code);
	window.getSelection().removeAllRanges();
	window.getSelection().addRange(range);
	document.execCommand("copy");
	window.getSelection().removeAllRanges();
	button.innerHTML = lang["translate"][lang_index].copy_code2;
}

// Clear Chat
function clearChat(target) {
	// Display confirmation dialog using SweetAlert2 library
	Swal.fire({
		title: lang["translate"][lang_index].confirmation_delete_chat1,
		text: lang["translate"][lang_index].confirmation_delete_chat2,
		icon: 'warning',
		showCancelButton: true,
		confirmButtonColor: '#3085d6',
		cancelButtonColor: '#d33',
		confirmButtonText: lang["translate"][lang_index].confirmation_delete_chat3,
		cancelButtonText: lang["translate"][lang_index].confirmation_delete_chat4
	}).then((result) => {
		// If user confirms deletion
		if (result.isConfirmed) {
			// If target is "all", clear chat history for all characters
			if (target == "all") {
				for (var i = 0; i < array_widgets.length; i++) {
					array_widgets[i]['last_chat'] = [];
				}
				// Display success message using SweetAlert2
				Swal.fire(
					lang["translate"][lang_index].confirmation_delete_chat5,
					lang["translate"][lang_index].confirmation_delete_chat_all,
					'success'
				)
			} else {
				// Otherwise, clear chat history for current character only
				array_widgets[data_index]['last_chat'] = [];
				// Display success message using SweetAlert2
				Swal.fire(
					lang["translate"][lang_index].confirmation_delete_chat5,
					lang["translate"][lang_index].confirmation_delete_current_chat,
					'success'
				)
			}

			// Clear chat display
			$("#overflow-chat").html("");
			// Reset chat history and add initial message
			array_chat = [];
			array_chat.push({
				"name": prompts_name,
				"message": prompts_training,
				"training": true,
				"isImg": false,
				"date": currentDate()
			})
			// Save updated character data to local storage
			localStorage.setItem("oracle_chat_v1", JSON.stringify(array_widgets));

			// If enabled, display welcome message for current character
			if (displayWelcomeMessage) {
				responseChat(array_widgets[data_index]['welcome_message']);
			}
		}
	})
}

function loadChat() {
	if (chat_history) {
		checkClearChatDisplay();

		for (var i = 0; i < array_widgets[data_index]['last_chat'].length; i++) {
			const currentChat = array_widgets[data_index]['last_chat'][i];

			if (currentChat.name === "User") {
				if (currentChat.isImg === true) {
					const imageID = Date.now();
					const imgURL = Array.isArray(currentChat.imgURL) ? currentChat.imgURL.map(url => url).join('') : '';
					const imgHtml = Array.isArray(currentChat.imgURL) ? currentChat.imgURL.map(url => `<div class="image-ia"><img onerror="this.src='img/no-image.svg'" src="${url}"></div>`).join('') : '';
					const chatHtml = `
				        <div class="conversation-thread thread-ai">
				          <div class="message-container">
				            <div class="message-info">
				              <div class="user-name"><h5>${prompts_name}</h5></div>
				              <div class="message-text">
					              <div class="chat-response no-white-space">
					              <p>${lang["translate"][lang_index].creating_ia_image} <strong class='ia-image-prompt-label'>${currentChat.message}</strong>
			                  <div class="wrapper-image-ia image_ia_${imageID}">
			                    ${imgHtml}
			                  </div>
			                  <p class='expire-img-message'>${lang["translate"][lang_index].expire_img_message}</p>					              
					              </div>
				              </div>
				            </div>
				              <div class='date-chat'><img src='img/icon-clock.svg'> ${currentChat.date || ''}</div>
				          </div>
				        </div>
		          `;
					$("#overflow-chat").append(chatHtml);
					array_chat.push({ "name": "User", "message": currentChat.message, "isImg": true, imgURL: currentChat.imgURL, "date": currentDate() });
				} else {
					const chatResponse = escapeHtml(currentChat.message)
					const chatHtml = `
				        <div class="conversation-thread thread-user">
				          <div class="message-container">
				            <div class="message-info">
										${copy_text_in_chat}
										${audio_in_chat}            
				              <div class="user-name"><h5>${lang["translate"][lang_index].you}</h5></div>
				              <div class="message-text">
				              <div class="chat-response">${chatResponse}</div>
				              </div>
				              <div class='date-chat'><img src='img/icon-clock.svg'> ${currentChat.date || ''}</div>
				            </div>
				          </div>
				        </div>
		          `;
					$("#overflow-chat").append(chatHtml);
					array_chat.push({ "name": "User", "message": currentChat.message, "isImg": false, "date": currentDate() });
				}

			} else {
				avatar_in_chat = display_avatar_in_chat ? `<div class="user-image"><img onerror="this.src='img/no-image.svg'" src="img/robot-avatar.png" alt="${prompts_name}" title="${prompts_name}"></div>` : '';
				audio_in_chat = display_audio_button_answers ? `<div class='chat-audio'><img data-play="false" src='img/btn_tts_play.svg'></div>` : '';

				if (!currentChat.training) {
					const chatResponse = escapeHtml(currentChat.message)
					const chatHtml = `

				        <div class="conversation-thread thread-ai">
				          ${avatar_in_chat}
				          <div class="message-container">
				            <div class="message-info">
										${copy_text_in_chat}
										${audio_in_chat}            
				              <div class="user-name"><h5>${currentChat.name}</h5></div>
				              <div class="message-text">
				              	<div class="chat-response">${chatResponse}</div>
				              </div>
				              <div class='date-chat'><img src='img/icon-clock.svg'> ${currentChat.date || ''}</div>
				            </div>
				          </div>
				        </div>
		          `;
					$("#overflow-chat").append(chatHtml);
				}

				array_chat.push({ "name": prompts_name, "message": currentChat.message, "training": currentChat.training, "date": currentDate() });
			}
		}
		hljs.highlightAll();
		setTimeout(function () {
			scrollChatBottom();
		}, 10);
	} else {
		if (displayWelcomeMessage) {
			responseChat(welcome_message);
		}
	}
}


//Check Clear Chat display
function checkClearChatDisplay() {
	if (array_widgets[data_index] && array_widgets[data_index].last_chat && array_widgets[data_index].last_chat.length > 1) {
		if (chat_history) {
			$("#clear-chat").show();
		}
	} else {
		$("#clear-chat").hide();
	}

	const hasLastChat = array_widgets.some((result) => {
		return result.last_chat && result.last_chat.length > 2;
	});

	if (hasLastChat) {
		$("#clear-all-chats").show();
	} else {
		$("#clear-all-chats").hide();
	}
}

//Error messages
function hideFeedback() {
	toastr.remove()
}

//Force chat to scroll down
function scrollChatBottom() {

	if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
		let body = document.getElementsByTagName("html")[0];
		body.scrollTop = body.scrollHeight;
	} else {
		let objDiv = document.getElementById("overflow-chat");
		objDiv.scrollTop = objDiv.scrollHeight;
	}

	hljs.highlightAll();

	setTimeout(function () {
		if (window.innerWidth < 768) {
			window.scrollTo(0, document.documentElement.scrollHeight);
		}
	}, 100);

}

//Enable chat input
function enableChat() {
	$(".character-typing").css('visibility', 'hidden')
	$(".btn-send-chat,#chat").attr("disabled", false);
	$(".btn-send-chat").show();
	$(".btn-cancel-chat").hide();
	var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
	if (!isMobile) {
		setTimeout(function () {
			$('#chat').focus();
		}, 500);
	}

}

//Disable chat input
function disableChat() {
	$(".character-typing").css('visibility', 'visible')
	$(".character-typing").css('display', 'flex');
	$(".character-typing span").html(prompts_name);
	$(".btn-send-chat,#chat").attr("disabled", true);
	$(".btn-send-chat").hide();
	$(".btn-cancel-chat").show();
}

function createTextFile(data) {
	let text = "";

	// Iterate over the array_chat array and add each message to the text variable
	data.shift();
	data.forEach(chat => {
		text += `${chat.name}: ${chat.message}\r\n`;
	});

	text = text.replace("User:", lang["translate"][lang_index].you + ":");

	// Create a Blob object with the text
	const blob = new Blob([text], { type: "text/plain" });

	// Return the Blob object
	return blob;
}

function downloadPdf() {

	var docDefinition = {
		content: [
			{ text: lang["translate"][lang_index].header_title_pdf, style: 'header' },
			"\n"
		],

		styles: {
			header: {
				fontSize: 22,
				bold: true
			},
			name: {
				fontSize: 14,
				color: '#0072c6',
				bold: true
			},
			message: {
				fontSize: 12,
				color: '#2c2c2c',
				bold: false,
				lineHeight: 1.2,
				marginTop: 4
			},
			date: {
				marginTop: 5,
				fontSize: 10,
				color: '#787878'
			},

			defaultStyle: {
				font: 'Roboto'
			}

		}
	};

	// Adds each array element to the docDefinition
	for (var i = 1; i < array_chat.length; i++) {
		var message = array_chat[i];
		var name = { text: message.name + ': ', style: 'name' };
		var messageText = { text: message.message.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu, ''), style: 'message' };

		docDefinition.content.push(name);
		docDefinition.content.push(messageText);
		docDefinition.content.push({ text: message.date, style: 'date' });
		docDefinition.content.push("\n");
	}

	// Create a pdfMake instance
	var pdfMakeInstance = pdfMake.createPdf(docDefinition);

	// Download pdf
	pdfMakeInstance.download('chat.pdf');
}

// Function to download the file
function downloadFile(blob, fileName) {
	// Create a URL object with the Blob
	const url = URL.createObjectURL(blob);

	// Create a download link and add it to the document
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);

	// Simulate a click on the link to trigger the download
	link.click();

	// Remove the link from the document
	document.body.removeChild(link);
}

// Function to handle the download button click event
function handleDownload() {
	const blob = createTextFile(array_chat);
	downloadFile(blob, "chat.txt");
}

//Chat audio
$(document).on("click", ".chat-audio", function () {
	var $this = $(this);
	var $img = $this.find("img");
	var $chatResponse = $this.siblings(".message-text").find(".chat-response")
	var play = $img.attr("data-play") == "true";

	if (play) {
		cancelSpeechSynthesis();
	}

	$img.attr({
		"src": "img/btn_tts_" + (play ? "play" : "stop") + ".svg",
		"data-play": play ? "false" : "true"
	});

	if (!play) {
		cancelSpeechSynthesis();

		// Remove botão de cópia do texto antes de sintetizar a fala
		var chatResponseText = $chatResponse.html().replace(/<button\b[^>]*\bclass="[^"]*\bcopy-code\b[^"]*"[^>]*>.*?<\/button>/ig, "");

		// Verifica se o recurso é suportado antes de chamar a função
		if ('speechSynthesis' in window) {
			doSpeechSynthesis(chatResponseText, $chatResponse);
		}
	}
});

function cleanStringToSynthesis(str) {
	str = str.trim()
		.replace(/<[^>]*>/g, "")
		.replace(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}|\u{1F900}-\u{1F9FF}|\u{1F1E0}-\u{1F1FF}|\u{1F200}-\u{1F2FF}|\u{1F700}-\u{1F77F}|\u{1F780}-\u{1F7FF}|\u{1F800}-\u{1F8FF}|\u{1F900}-\u{1F9FF}|\u{1FA00}-\u{1FA6F}|\u{1FA70}-\u{1FAFF}]/gu, '')
		.replace(/<div\s+class="date-chat".*?<\/div>/g, '')
		.replace(/\n/g, '');
	return str;
}

function cancelSpeechSynthesis() {
	if (window.speechSynthesis) {
		window.speechSynthesis.cancel();
	}
}


function doSpeechSynthesis(longText, chatResponse) {

	$("span.chat-response-highlight").each(function () {
		$(this).replaceWith($(this).text());
	});

	longText = cleanStringToSynthesis(longText);

	// The maximum number of characters in each part
	const maxLength = 100;

	// Find the indices of punctuation marks in the longText string
	const punctuationIndices = [...longText.matchAll(/[,.?!]/g)].map(match => match.index);

	// Divide the text into smaller parts at the punctuation marks
	const textParts = [];
	let startIndex = 0;
	for (let i = 0; i < punctuationIndices.length; i++) {
		if (punctuationIndices[i] - startIndex < maxLength) {
			continue;
		}
		textParts.push(longText.substring(startIndex, punctuationIndices[i] + 1));
		startIndex = punctuationIndices[i] + 1;
	}
	if (startIndex < longText.length) {
		textParts.push(longText.substring(startIndex));
	}


	const utterances = textParts.map(textPart => {
		const settings = getSettings();
		google_voice_lang_code = settings.voiceOfPlayback.split('***')[0];
		google_voice = settings.voiceOfPlayback.split('***')[1];

		const utterance = new SpeechSynthesisUtterance(textPart);
		utterance.lang = google_voice_lang_code;
		utterance.voice = speechSynthesis.getVoices().find(voice => voice.name === google_voice);

		if (!utterance.voice) {
			const backupVoice = array_voices.find(voice => voice.lang === utterance.lang);
			if (backupVoice) {
				utterance.voice = speechSynthesis.getVoices().find(voice => voice.name === backupVoice.name);
			}
		}
		return utterance;
	});


	// Define the end of speech event
	utterances[utterances.length - 1].addEventListener("end", () => {
		$(".chat-audio img").attr("src", "img/btn_tts_play.svg");
		$(".chat-audio img").attr("data-play", "false");
	});

	let firstChat = false;
	// Read each piece of text sequentially
	function speakTextParts(index = 0) {
		if (index < utterances.length) {
			const textToHighlight = textParts[index];
			const highlightIndex = longText.indexOf(textToHighlight);

			// Highlight the text
			chatResponse.html(chatResponse.html().replace(textToHighlight, `<span class="chat-response-highlight">${textToHighlight}</span>`));

			// Speak the text
			speechSynthesis.speak(utterances[index]);
			utterances[index].addEventListener("end", () => {
				// Remove the highlight
				chatResponse.html(chatResponse.html().replace(`<span class="chat-response-highlight">${textToHighlight}</span>`, textToHighlight));
				speakTextParts(index + 1);
			});

			// Remove the highlight if speech synthesis is interrupted
			speechSynthesis.addEventListener('pause', () => {
				chatResponse.html(chatResponse.html().replace(`<span class="chat-response-highlight">${textToHighlight}</span>`, textToHighlight));
			}, { once: true });
		}
	}

	// Begin speak
	speakTextParts();
}

window.speechSynthesis.onvoiceschanged = function () {
	getTextToSpeechVoices();
};

function displayVoices() {
	console.table(array_voices)
}

function getTextToSpeechVoices() {
	window.speechSynthesis.getVoices().forEach(function (voice) {
		const voiceObj = {
			name: voice.name,
			lang: voice.lang
		};
		array_voices.push(voiceObj);
	});
}

//Display employees description
const myModalEl = document.getElementById('modalDefault')
myModalEl.addEventListener('show.bs.modal', event => {
	$("#modalDefault .modal-body").html(array_widgets[data_index].description);
})

const myModalConfig = document.getElementById('modalConfig')
myModalConfig.addEventListener('show.bs.modal', event => {
	loadSettings(); // Cargar los ajustes al cargar la página
	//console.log('Load settings');
	//$("#modalConfig .modal-title").html(array_widgets[data_index].name);
	//$("#modalConfig .modal-body").html(array_widgets[data_index].description);
})

// Define the key for the localStorage storage item
const localStorageKey = "col-contacts-border-display";

// Get the current display state of the div from localStorage, if it exists
let displayState = localStorage.getItem(localStorageKey);
if (displayState) {
	$(".col-contacts-border").css("display", displayState);
} else {
	// If the display state of the div is not stored in localStorage, set the default state to "none"
	$(".col-contacts-border").css("display", "none");
}

// Add the click event to toggle the display state of the div
$(".toggle_employees_list").on("click", function () {
	$(".col-contacts-border").toggle();

	// Get the new display state of the div
	displayState = $(".col-contacts-border").css("display");

	// Store the new display state of the div in localStorage
	localStorage.setItem(localStorageKey, displayState);
});


toastr.options = {
	"closeButton": true,
	"debug": false,
	"newestOnTop": false,
	"progressBar": true,
	"positionClass": "toast-bottom-full-width",
	"preventDuplicates": true,
	"onclick": null,
	"showDuration": "300",
	"hideDuration": "1000",
	"timeOut": "5000",
	"extendedTimeOut": "2000",
	"showEasing": "swing",
	"hideEasing": "linear",
	"showMethod": "fadeIn",
	"hideMethod": "fadeOut"
}


const textarea = document.querySelector('#chat');
const microphoneButton = document.querySelector('#microphone-button');

let isTranscribing = false; // Initially not transcribing

function loadSpeechRecognition() {
	if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
		recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

		const settings = getSettings();
		microphone_speak_lang = settings.microphoneLanguage;

		recognition.lang = microphone_speak_lang;
		recognition.continuous = true;

		recognition.addEventListener('start', () => {
			console.log('microphone activated');
			$(".btn-send-chat").attr("disabled", true);
			$("#microphone-button").attr("src", "img/mic-stop.svg")
		});

		recognition.addEventListener('result', (event) => {
			const transcript = event.results[0][0].transcript;
			textarea.value += transcript + '\n';
		});

		recognition.addEventListener('end', () => {
			console.log('microphone off');
			$(".btn-send-chat").attr("disabled", false);
			$("#microphone-button").attr("src", "img/mic-start.svg")
			isTranscribing = false; // Define a transcrição como encerrada
		});

		microphoneButton.addEventListener('click', () => {
			if (!isTranscribing) {
				// Start transcription if not transcrivendo
				recognition.start();
				isTranscribing = true;
			} else {
				// Stop transcription if already transcribing
				recognition.stop();
				isTranscribing = false;
			}
		});
	} else {
		toastr.error('Web Speech Recognition API not supported by browser');
		$("#microphone-button").hide()
	}
}

function generateUUID() {
	let d = new Date().getTime();
	if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
		d += performance.now(); //use high-precision timer if available
	}
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		const r = (d + Math.random() * 16) % 16 | 0;
		d = Math.floor(d / 16);
		return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
	});
}

// Función para cargar los datos del localStorage al formulario si están disponibles
function loadSettings() {
	const settings = getSettings();

	// Cargando valores por defecto
	$('#voiceOfPlayback').val(settings.voiceOfPlayback);
	$('#microphoneLanguage').val(settings.microphoneLanguage);
	$('#answersToggle').prop('checked', settings.answersToggle);
}

function getSettings() {
	let settings = '';
	const textTalkSettings = localStorage.getItem('text-talk-settings');
	if (textTalkSettings) {
		settings = JSON.parse(textTalkSettings);
	} else {
		settings = createAndSaveSettings(); // Llama a la función para crear y guardar los ajustes si no se encuentran en el localStorage
	}
	if(uuid == ''){
		uuid = settings.id;
	}
	return settings;
}

// Función para crear y guardar los ajustes en el localStorage
function createAndSaveSettings() {
	const settings = {
		id: generateUUID(),
		voiceOfPlayback: `${google_voice_lang_code}***${google_voice}`,
		microphoneLanguage: microphone_speak_lang,
		answersToggle: true
	};
	localStorage.setItem('text-talk-settings', JSON.stringify(settings));
	return settings;
}

// Verifica si la síntesis de voz es compatible con el navegador
if ('speechSynthesis' in window) {
	// Espera a que las voces estén cargadas antes de listarlas
	window.speechSynthesis.onvoiceschanged = function () {
		// Obtén todas las voces disponibles
		const voices = speechSynthesis.getVoices();

		// Filtra las voces que tienen 'en' como prefijo para identificar las voces en inglés
		const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));

		// Obtén el elemento select por su id
		const dropdown = document.getElementById('voiceOfPlayback');

		// Eliminar las opciones anteriores del dropdown
		dropdown.innerHTML = '';

		// Pobla el dropdown con las voces en inglés disponibles
		englishVoices.forEach(function (voice) {
			const option = document.createElement('option');
			option.value = `${voice.lang}***${voice.name}`;
			option.text = voice.name;
			dropdown.appendChild(option);
		});
	};
} else {
	console.error('La síntesis de voz no es compatible con este navegador.');
}

// Cargar idiomas de reconocimiento por micrófono
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
	const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

	// Obtén los idiomas soportados para el reconocimiento de voz
	const supportedLanguages = { 'en-US': 'Google US English', 'en-GB': 'Google UK English' };

	// Obtener el elemento select por su id
	const dropdown = document.getElementById('microphoneLanguage');

	// Eliminar las opciones anteriores del dropdown
	dropdown.innerHTML = '';

	// Poblar el dropdown con los idiomas disponibles para el reconocimiento de voz
	for (const langCode in supportedLanguages) {
		if (Object.hasOwnProperty.call(supportedLanguages, langCode)) {
			const langName = supportedLanguages[langCode];
			const option = document.createElement('option');
			option.value = langCode;
			option.text = langName;
			dropdown.appendChild(option);
		}
	}
} else {
	console.error('El reconocimiento de voz no es compatible con este navegador.');
}



$(document).ready(function () {
	// Manejador de evento para guardar los ajustes al enviar el formulario
	$('#modal-settings-submit').click(function (event) {
		event.preventDefault(); // Evitar que se envíe el formulario
		let settings = getSettings();
		settings = {
			id: settings.id,
			voiceOfPlayback: $('#voiceOfPlayback').val(),
			microphoneLanguage: $('#microphoneLanguage').val(),
			answersToggle: $('#answersToggle').is(':checked')
		};
		recognition.lang = settings.microphoneLanguage;
		localStorage.setItem('text-talk-settings', JSON.stringify(settings));
		$('#modalConfig').modal('hide');
	});

	// Maneja el conteo de caracteres
	$('#textArea').on('input', function () {
		var maxLength = 4000;
		var currentLength = $(this).val().length;
		var remaining = maxLength - currentLength;
		$('#charCount').text(remaining);
	});
});
