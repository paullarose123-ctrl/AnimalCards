// Logo AnimalCards : le nom en minuscules très grasses (Outfit), dont le point du « i »
// est une petite carte verte inclinée. Tout est en em : la taille suit le font-size du parent.
// La couleur du texte suit `color` ; celle de la carte, la variable --logo-card (vert par défaut).

interface LogoProps {
  className?: string;
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <span className={`logo ${className}`} role="img" aria-label="AnimalCards">
      <span aria-hidden="true">
        an
        <span className="logo__i">
          ı<i className="logo__card" />
        </span>
        malcards
      </span>
    </span>
  );
}

/** La carte seule, pour les petits espaces (icône, médaillon). */
export function LogoMark({ className = '' }: LogoProps) {
  return <i className={`logo-mark ${className}`} aria-hidden="true" />;
}
