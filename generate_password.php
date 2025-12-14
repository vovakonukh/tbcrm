<?php
// generate_password.php - Генератор хеша пароля (удалить после использования)

//admin
//UG&gY77g7fr6rFY^R
//
//p.smorodin
//G6tr$g)n6fre
//
//o.oplesnina
//G8grHgy&$g

//e.romanova
//H&yFR$Rdset

//a.piksaeva
//H8tYF%6etds5

//
//

$username = 'n.ivanova';
$password = 'H8tYF%G^r6e3';
$hash = password_hash($password, PASSWORD_DEFAULT);

echo "Пароль: " . $password . "<br>";
echo "Хеш: " . $hash . "<br><br>";

echo "<b>SQL для обновления:</b><br>";
echo "<pre>";
echo "UPDATE users SET password = '" . $hash . "'" . " WHERE username = '$username';";
echo "</pre>";

echo "<b>SQL для добавления:</b><br>";
echo "<pre>";
echo "INSERT INTO users (`username`, `password`, `is_active`)
VALUES ('$username', '" . $hash . "'," . "'1')";
echo "</pre>";
?>