$(document).ready(function () {
	$(".name-change").hide();

	$("#change-name-link").click(function(){
		$(".name-text").fadeOut(100);
		$(".name-change").delay(100).fadeIn(100);
	});

	$("#cancel-name-change-link").click(function(){
		$(".name-change").fadeOut(100);
		$(".name-text").delay(100).fadeIn(100);
	});
});