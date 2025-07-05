export default function Home() {
  // You can have any number of images
  const imageCount = 5;
  const images = Array.from(
    { length: imageCount },
    (_, i) => `/images/gigs/gig${i + 1}.jpg`
  );

  return (
    <div className="relative min-h-100 flex items-center justify-center mt-10">
      {/* Background image layer */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {images.map((src, i) => {
          const row = Math.floor(i / 5);
          const col = i % 5;
          const top = `${row * 22}%`;
          const left = `${col * 20}%`;
          const rotate = -15; // All images same direction & angle

          return (
            <img
              key={i}
              src={src}
              alt=""
              className="absolute w-44 h-28 object-cover rounded-xl opacity-25"
              style={{
                top,
                left,
                transform: `rotate(${rotate}deg)`,
              }}
            />
          );
        })}
      </div>

      {/* Foreground content */}
      <div className="relative z-10 text-center px-4">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-4">
          Welcome to GigPilot
        </h1>
        <p className="text-lg text-gray-600">
          Find or post local freelance tasks in seconds.
        </p>
      </div>
    </div>
  );
}
