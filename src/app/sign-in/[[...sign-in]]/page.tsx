import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-bg-abyss flex items-center justify-center relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-sage/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-bg-forest/20 rounded-full blur-3xl" />
      </div>
      
      <div className="z-10 relative">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-black text-accent-mint uppercase tracking-wider mb-2">
            AEGIS Command Login
          </h1>
          <p className="font-mono text-xs text-accent-sage/60 uppercase tracking-widest">
            SECURE ACCESS PORTAL
          </p>
        </div>
        
        <SignIn 
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-bg-deep/80 border border-accent-sage/20 backdrop-blur-xl shadow-2xl rounded-xl',
              headerTitle: 'text-accent-mint font-heading',
              headerSubtitle: 'text-accent-sage font-mono text-xs',
              socialButtonsBlockButton: 'border border-accent-sage/30 hover:bg-bg-abyss/50 text-accent-mint',
              socialButtonsBlockButtonText: 'text-accent-mint font-mono text-xs uppercase tracking-wider',
              dividerLine: 'bg-accent-sage/20',
              dividerText: 'text-accent-sage/50 font-mono text-xs',
              formFieldLabel: 'text-accent-sage font-mono text-[10px] uppercase tracking-wider',
              formFieldInput: 'bg-bg-abyss/50 border border-accent-sage/30 text-accent-mint focus:border-accent-mint rounded-md',
              formButtonPrimary: 'bg-bg-pine hover:bg-bg-forest text-accent-mint border border-accent-sage/30 font-mono uppercase tracking-wider text-xs transition-colors',
              footerActionText: 'text-accent-sage/70 font-mono text-xs',
              footerActionLink: 'text-info-cyan hover:text-info-cyan/80 font-mono text-xs',
            }
          }}
          routing="path" 
          path="/sign-in" 
        />
      </div>
    </div>
  );
}
