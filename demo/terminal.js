
var worker;
var sampleVideoData;
var sampleAudioData;
var running = false;
var isWorkerLoaded = false;
var isSupported = (function() {
  return document.querySelector && window.URL && window.Worker;
})();

function isReady() {
  return !running && isWorkerLoaded && sampleVideoData && sampleAudioData;
}

function startRunning() {
  running = true;
}
function stopRunning() {
  running = false;
}

function parseArguments(text) {
  text = text.replace(/\s+/g, ' ');
  var args = [];
  // Allow double quotes to not split args.
  text.split('"').forEach(function(t, i) {
    t = t.trim();
    if ((i % 2) === 1) {
      args.push(t);
    } else {
      args = args.concat(t.split(" "));
    }
  });
  return args;
}

function getDownloadLink(fileData, fileName) {
  if (fileName.match(/\.jpeg|\.gif|\.jpg|\.png/)) {
    var blob = new Blob([fileData]);
    var src = window.URL.createObjectURL(blob);
    var img = document.createElement('img');

    img.src = src;
    return img;
  }
  else {
    var a = document.createElement('a');
    a.download = fileName;
    var blob = new Blob([fileData]);
    var src = window.URL.createObjectURL(blob);
    a.href = src;
    a.textContent = 'Click here to download ' + fileName + "!";
    return a;
  }
}


function b64toBlob(b64Data, contentType='', sliceSize=512) {
	const byteCharacters = atob(b64Data);
	const byteArrays = [];

	for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
		const slice = byteCharacters.slice(offset, offset + sliceSize);

		const byteNumbers = new Array(slice.length);
		for (let i = 0; i < slice.length; i++) {
			byteNumbers[i] = slice.charCodeAt(i);
		}

		const byteArray = new Uint8Array(byteNumbers);
		byteArrays.push(byteArray);
	}

	const blob = new Blob(byteArrays, {type: contentType});
	return blob;
}
var framerate = 30;
function changeFramerate() {
	let slider = document.getElementById('slider');
	framerate = slider.value;
	document.getElementById('slider-label').innerText = slider.value;
}
function toggleSlider(){
	let slider = document.getElementById('slider');
	slider.disabled = !slider.disabled;
}
var videoWriter; 
function showKonataPictures(path) {
	toggleSlider();
	videoWriter = new WebMWriter({frameRate: framerate,fileWriter: null});
	console.log('Current framerate: ',framerate);
	let image_count = path.target.files.length;
	for(let i = 0;i<path.target.files.length;i++){
		console.log(path.target.files[i]);
		let file = path.target.files[i];
		var reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = readerEvent => {
			var content = readerEvent.target.result; // this is the content!
			
			content = content.replace(/.*base64,/,'');
			//console.log(content);
			const blob = b64toBlob(content, 'image/png');
			const blobUrl = URL.createObjectURL(blob);

			let canvas = document.getElementById("canvas");
			let context = canvas.getContext("2d");
			
			//console.log('File content: ',blobUrl);
			let img = new Image;
			img.src = blobUrl;
			img.onload = () => {
				context.clearRect(0,0,500,500);
				context.drawImage(img,0,0,500,500);
				videoWriter.addFrame(canvas);
				image_count -= 1;
				if(image_count == 0){
					document.getElementById('image-loaded').innerText = "Loaded every image";
				}
			};
		}
	}
}
function resetApp() {
	document.getElementById('canvas').getContext("2d").clearRect(0,0,500,500);
	document.getElementById('image-loaded').innerText = '';
	videoWriter = new WebMWriter({frameRate: framerate,fileWriter: null});
	let video = document.getElementById('video');
	video.pause();
	video.removeAttribute('src');
	video.load();
	document.getElementById('slider').disabled = false;
}
function processWebm() {
	let video = document.getElementById('video-fortnite');
	videoWriter.complete()
		.then(function(webMBlob) {
			//video.src = URL.createObjectURL(webMBlob);
			console.log('Video: ', video.src);
			//console.log(webMBlob);
			
			var oReq = new XMLHttpRequest();
			oReq.open("GET",  URL.createObjectURL(webMBlob), true);
			oReq.responseType = "arraybuffer";

			oReq.onload = function (oEvent) {
				var arrayBuffer = oReq.response;
				if (arrayBuffer) {
					console.log("Initialised fortnite video");
					sampleVideoData = new Uint8Array(arrayBuffer);
				}
				else {
					console.log("Array buffer empty on fortnite video request");
					console.log(oReq);
					sampleVideoData = new Uint8Array(webMBlob.arrayBuffer());
				}
			};
			oReq.send(null);
			
			initTerminal();
	});
}
function initWorker() {
	worker = new Worker("worker-asm.js");
	worker.onmessage = function (event) {
		var message = event.data;
		if (message.type == "ready") {
			isWorkerLoaded = true;
			worker.postMessage({
				type: "command",
				arguments: parseArguments("-i video.webm -i audio.mp3 -map 0:v -map 1:a -c:v copy -shortest -strict -2 output.webm"),
				files: [
					{
						"name": "video.webm",
						"data": sampleVideoData
					},
					{
						"name": "audio.mp3",
						"data": sampleAudioData
					}
				]
			});
		}
		else if (message.type == "stdout") {			
			console.log("Worker: ", message.data);

		} else if (message.type == "start") {	
			console.log("Worker: ","Worker has received command");

		} else if (message.type == "done") {
			stopRunning();
			var buffers = message.data;
			if (buffers.length) {
				console.log("Worker: ","closed");
			}
			buffers.forEach(function(file) {
				console.log(file);
				var blob = new Blob([file.data],{type: "video/mp4"});
				document.getElementById('video-fortnite').src = window.URL.createObjectURL(blob);
			});
		}
	};
}
function initTerminal() {
	initWorker();
}

function audioLoad() {
	oReq = new XMLHttpRequest();
	oReq.open("GET", "audio.mp3", true);
	oReq.responseType = "arraybuffer";

	oReq.onload = function (oEvent) {
		var arrayBuffer = oReq.response;
		if (arrayBuffer) {
		  sampleAudioData = new Uint8Array(arrayBuffer);
		}
	};

	oReq.send(null);
}


document.addEventListener("DOMContentLoaded", function() {
	var input = document.getElementById('file-input');
	input.onchange = showKonataPictures;
	
	audioLoad();
	
});