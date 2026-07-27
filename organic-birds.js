(()=>{
  const birds = animals.filter(a => a.kind === 'bird');

  birds.forEach((bird, index) => {
    const leftWing = bird.g.children[1];
    const rightWing = bird.g.children[2];

    bird.flight = {
      leftWing,
      rightWing,
      phase: Math.random() * Math.PI * 2,
      frequency: 5.2 + Math.random() * 2.2,
      strength: 0.7 + Math.random() * 0.25,
      glideOffset: Math.random() * 4,
      bodyPhase: Math.random() * Math.PI * 2,
      index
    };

    leftWing.rotation.order = 'ZXY';
    rightWing.rotation.order = 'ZXY';
  });

  function animateOrganicWings(timeMs) {
    const t = timeMs * 0.001;

    for (const bird of birds) {
      const f = bird.flight;

      // Alterna battito e brevi momenti di planata.
      const cycle = (t + f.glideOffset) % 5.2;
      const gliding = cycle > 3.9;
      const envelope = gliding ? 0.16 : 1;

      // Il seno principale apre e chiude le ali; la seconda armonica
      // evita un movimento perfettamente meccanico.
      const primary = Math.sin(t * f.frequency + f.phase);
      const secondary = Math.sin(t * f.frequency * 2.03 + f.phase * 0.7) * 0.13;
      const flap = (primary + secondary) * f.strength * envelope;

      f.leftWing.rotation.z = 0.12 + flap;
      f.rightWing.rotation.z = -0.12 - flap;

      // Una lieve torsione delle ali durante il colpo verso il basso.
      const twist = Math.cos(t * f.frequency + f.phase) * 0.18 * envelope;
      f.leftWing.rotation.y = twist;
      f.rightWing.rotation.y = -twist;

      // Il corpo ondeggia appena e si inclina durante la planata.
      bird.g.rotation.z = Math.sin(t * 0.8 + f.bodyPhase) * 0.07;
      bird.g.rotation.x = gliding ? -0.08 : Math.sin(t * f.frequency + f.phase) * 0.025;
      bird.g.position.y += Math.sin(t * 1.7 + f.bodyPhase) * 0.0018;
    }

    requestAnimationFrame(animateOrganicWings);
  }

  requestAnimationFrame(animateOrganicWings);
})();
