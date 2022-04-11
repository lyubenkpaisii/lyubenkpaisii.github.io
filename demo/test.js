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
function downloadWebm() {
	let video = document.getElementsByTagName("video")[0];
	videoWriter.complete()
		.then(function(webMBlob) {
			video.src = URL.createObjectURL(webMBlob);
			console.log('Video: ',webMBlob);
	});
}

document.addEventListener('DOMContentLoaded', function() {
	//console.log(videoWriter);
	var input = document.getElementById('file-input');
	input.onchange = showKonataPictures;
}, false);