$(document).ready(function () {
	$(".email-change").hide();
	$(".name-change").hide();

	$("#change-email-link").click(function(){
		$(".email-text").fadeOut(100);
		$(".email-change").delay(100).fadeIn(100);
	});

	$("#cancel-email-change-link").click(function(){
		$(".email-change").fadeOut(100);
		$(".email-text").delay(100).fadeIn(100);
	});

	$("#change-name-link").click(function(){
		$(".name-text").fadeOut(100);
		$(".name-change").delay(100).fadeIn(100);
	});

	$("#cancel-name-change-link").click(function(){
		$(".name-change").fadeOut(100);
		$(".name-text").delay(100).fadeIn(100);
	});
});