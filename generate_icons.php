<?php
/* 
Генератор иконок PWA
Создаёт PNG-иконки разных размеров из SVG-шаблона
Использование: php generate_icons.php
*/

$sizes = [72, 96, 128, 144, 152, 192, 384, 512];
$outputDir = __DIR__ . '/assets/icons/';

/* Создаём папку если нет */
if (!is_dir($outputDir)) {
    mkdir($outputDir, 0755, true);
}

/* SVG-шаблон иконки */
$svgTemplate = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#2563eb"/>
  <path d="M256 120c-75 0-136 61-136 136s61 136 136 136 136-61 136-136-61-136-136-136zm0 40c53 0 96 43 96 96s-43 96-96 96-96-43-96-96 43-96 96-96z" fill="white"/>
  <circle cx="256" cy="256" r="48" fill="white"/>
  <path d="M120 360l40-40 28 28-40 40z" fill="white"/>
  <path d="M352 360l40-40 28 28-40 40z" fill="white" transform="rotate(90 372 360)"/>
</svg>
SVG;

echo "Генерация иконок PWA...\n\n";

foreach ($sizes as $size) {
    $filename = "icon-{$size}x{$size}.png";
    $filepath = $outputDir . $filename;
    
    /* Проверяем наличие ImageMagick или GD */
    if (extension_loaded('imagick')) {
        /* Используем ImageMagick */
        $imagick = new Imagick();
        $imagick->readImageBlob($svgTemplate);
        $imagick->setImageFormat('png');
        $imagick->resizeImage($size, $size, Imagick::FILTER_LANCZOS, 1);
        $imagick->writeImage($filepath);
        $imagick->clear();
        echo "✓ Создан: $filename (ImageMagick)\n";
    } elseif (function_exists('imagecreatetruecolor')) {
        /* Создаём простую PNG заглушку через GD */
        $img = imagecreatetruecolor($size, $size);
        $bgColor = imagecolorallocate($img, 37, 99, 235);
        $white = imagecolorallocate($img, 255, 255, 255);
        
        imagefill($img, 0, 0, $bgColor);
        
        /* Рисуем круг в центре */
        $center = $size / 2;
        $radius = $size * 0.3;
        imagefilledellipse($img, $center, $center, $radius * 2, $radius * 2, $white);
        
        /* Внутренний круг (отверстие) */
        $innerRadius = $size * 0.15;
        imagefilledellipse($img, $center, $center, $innerRadius * 2, $innerRadius * 2, $bgColor);
        
        /* Точка в центре */
        $dotRadius = $size * 0.08;
        imagefilledellipse($img, $center, $center, $dotRadius * 2, $dotRadius * 2, $white);
        
        imagepng($img, $filepath);
        imagedestroy($img);
        echo "✓ Создан: $filename (GD)\n";
    } else {
        /* Создаём SVG как fallback */
        $svgPath = $outputDir . "icon-{$size}x{$size}.svg";
        file_put_contents($svgPath, $svgTemplate);
        echo "⚠ SVG создан: icon-{$size}x{$size}.svg (нет ImageMagick/GD)\n";
    }
}

echo "\nГотово! Иконки в папке: $outputDir\n";
echo "Примечание: для полноценной генерации PNG установите расширение GD или ImageMagick.\n";
