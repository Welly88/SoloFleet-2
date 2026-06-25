import React from "react";
import { WebView } from "react-native-webview";

const ParticleBackground = () => {
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      html, body {
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: transparent;
        width: 100%;
        height: 100%;
      }

      canvas {
        display: block;
        width: 100%;
        height: 100%;
      }
    </style>
  </head>

  <body>
    <canvas id="particleCanvas"></canvas>

    <script>
      const canvas = document.getElementById("particleCanvas");
      const ctx = canvas.getContext("2d");

      function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);

      const particles = [];
      const particleCount = 70;
      const connectionDistance = 150;
      const mouseRadius = 150;

      let mouse = {
        x: null,
        y: null
      };

      // Desktop mouse
      window.addEventListener("mousemove", (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      });

      window.addEventListener("mouseleave", () => {
        mouse.x = null;
        mouse.y = null;
      });

      // Mobile touch
      window.addEventListener("touchstart", (e) => {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
      });

      window.addEventListener("touchmove", (e) => {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
      });

      window.addEventListener("touchend", () => {
        setTimeout(() => {
          mouse.x = null;
          mouse.y = null;
        }, 200);
      });

      class Particle {
        constructor() {
          this.x = Math.random() * canvas.width;
          this.y = Math.random() * canvas.height;

          this.vx = (Math.random() - 0.5) * 1.5;
          this.vy = (Math.random() - 0.5) * 1.5;

          this.radius = Math.random() * 2 + 1;

          this.color = "rgba(37, 99, 235, 0.8)";
        }

        draw() {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
          ctx.fillStyle = this.color;
          ctx.fill();
        }

        update() {
          // Bounce dinding
          if (this.x <= 0 || this.x >= canvas.width) {
            this.vx *= -1;
          }

          if (this.y <= 0 || this.y >= canvas.height) {
            this.vy *= -1;
          }

          // Interaksi touch/mouse
          if (mouse.x !== null && mouse.y !== null) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < mouseRadius) {
              const force = (mouseRadius - distance) / mouseRadius;

              const forceX = (dx / distance) * force * 3;
              const forceY = (dy / distance) * force * 3;

              // Tolak partikel
              this.vx -= forceX * 0.25;
              this.vy -= forceY * 0.25;
            }
          }

          // Minimum speed supaya tidak pernah mati
          if (Math.abs(this.vx) < 0.25) {
            this.vx = this.vx >= 0 ? 0.25 : -0.25;
          }

          if (Math.abs(this.vy) < 0.25) {
            this.vy = this.vy >= 0 ? 0.25 : -0.25;
          }

          // Maximum speed
          const maxSpeed = 3;

          this.vx = Math.max(
            -maxSpeed,
            Math.min(maxSpeed, this.vx)
          );

          this.vy = Math.max(
            -maxSpeed,
            Math.min(maxSpeed, this.vy)
          );

          this.x += this.vx;
          this.y += this.vy;
        }
      }

      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }

      function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < connectionDistance) {
              const opacity =
                (1 - distance / connectionDistance) * 0.5;

              ctx.beginPath();
              ctx.strokeStyle =
                "rgba(37,99,235," + opacity + ")";

              ctx.lineWidth = 1;

              ctx.moveTo(
                particles[i].x,
                particles[i].y
              );

              ctx.lineTo(
                particles[j].x,
                particles[j].y
              );

              ctx.stroke();
            }
          }
        }
      }

      function animate() {
        ctx.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        particles.forEach((particle) => {
          particle.update();
          particle.draw();
        });

        drawConnections();

        requestAnimationFrame(animate);
      }

      animate();
    </script>
  </body>
  </html>
  `;

  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html: htmlContent }}
      style={{
        flex: 1,
        backgroundColor: "transparent",
      }}
      scrollEnabled={false}
      bounces={false}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    />
  );
};

export default ParticleBackground;