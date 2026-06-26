import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiError, apiFieldErrors } from '../../lib/api';
import AuthShell from '../../components/layout/AuthShell.jsx';
import { Input } from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';

export default function Register() {
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await register({
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim(),
        password: form.password,
      });
      toast('Welcome to ConnectSphere! Check your email to verify your address.', 'success');
      navigate('/', { replace: true });
    } catch (err) {
      setErrors(apiFieldErrors(err));
      toast(apiError(err, 'Could not create your account'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h2 className="font-display text-2xl font-bold text-ink dark:text-white">Create your account</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Join the conversation in under a minute.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
        <Input
          id="name"
          name="name"
          label="Display name"
          placeholder="Ada Lovelace"
          autoComplete="name"
          value={form.name}
          onChange={onChange}
          error={errors.name}
          required
        />
        <Input
          id="username"
          name="username"
          label="Username"
          placeholder="ada"
          autoComplete="username"
          value={form.username}
          onChange={onChange}
          error={errors.username}
          required
        />
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={onChange}
          error={errors.email}
          required
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={form.password}
          onChange={onChange}
          error={errors.password}
          required
        />
        <p className="-mt-2 text-xs text-slate-400">
          Use 8+ characters with an uppercase letter, a lowercase letter, and a number.
        </p>
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
