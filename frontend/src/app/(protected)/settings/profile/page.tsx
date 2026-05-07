"use client";

import { useState } from "react";
import { User, Lock, Save, CheckCircle2 } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuthStore } from "@/stores/auth-store";
import { useUpdateProfile, useChangePassword } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";

export default function ProfilePage() {
  usePageTitle("Profile");
  const user = useAuthStore((s) => s.user);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const handleProfileSave = () => {
    setProfileSuccess(false);
    setProfileError("");
    if (!firstName.trim()) { setProfileError("First name is required."); return; }
    if (!lastName.trim()) { setProfileError("Last name is required."); return; }
    if (!email.trim()) { setProfileError("Email is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setProfileError("Enter a valid email address."); return; }
    updateProfile.mutate(
      { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() },
      {
        onSuccess: () => setProfileSuccess(true),
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setProfileError(Array.isArray(msg) ? msg[0] : msg || "Failed to update profile.");
        },
      },
    );
  };

  const handlePasswordChange = () => {
    setPasswordError("");
    setPasswordSuccess(false);

    if (!oldPassword) { setPasswordError("Current password is required."); return; }
    if (!newPassword) { setPasswordError("New password is required."); return; }
    if (!confirmPassword) { setPasswordError("Please confirm your new password."); return; }
    if (newPassword.length < 8) { setPasswordError("New password must be at least 8 characters."); return; }
    if (!/[A-Z]/.test(newPassword)) { setPasswordError("Password must contain at least one uppercase letter."); return; }
    if (!/[a-z]/.test(newPassword)) { setPasswordError("Password must contain at least one lowercase letter."); return; }
    if (!/[0-9]/.test(newPassword)) { setPasswordError("Password must contain at least one number."); return; }
    if (!/[^A-Za-z0-9]/.test(newPassword)) { setPasswordError("Password must contain at least one special character."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("New passwords do not match."); return; }

    changePassword.mutate(
      { oldPassword, newPassword },
      {
        onSuccess: () => {
          setPasswordSuccess(true);
          setOldPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } })
            ?.response?.data?.message;
          setPasswordError(
            Array.isArray(msg) ? msg[0] : msg || "Failed to change password",
          );
        },
      },
    );
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h1 className="text-[18px] font-semibold text-on-surface">
            My Profile
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 max-w-2xl">
        {/* Profile Info */}
        <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5 space-y-4">
          <div className="flex items-center gap-4 mb-2">
            <Avatar
              name={`${user.firstName} ${user.lastName}`}
              size="lg"
            />
            <div>
              <p className="text-[16px] font-semibold text-on-surface">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[13px] text-on-surface-variant">{user.email}</p>
              <Badge
                variant={
                  user.role === "ADMIN"
                    ? "primary"
                    : user.role === "MANAGER"
                      ? "info"
                      : "default"
                }
                className="mt-1"
              >
                {user.role}
              </Badge>
            </div>
          </div>

          {profileSuccess && (
            <Alert variant="success">Profile updated successfully</Alert>
          )}

          {(updateProfile.isError || profileError) && (
            <Alert variant="error">{profileError || "Failed to update profile"}</Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant">
                First Name
              </label>
              <Input
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setProfileSuccess(false); }}
                placeholder="First name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant">
                Last Name
              </label>
              <Input
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); setProfileSuccess(false); }}
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-on-surface-variant">
              Email Address
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setProfileSuccess(false); }}
              placeholder="Email"
            />
          </div>

          <Button
            onClick={handleProfileSave}
            disabled={updateProfile.isPending}
            loading={updateProfile.isPending}
            size="sm"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save Changes
          </Button>
        </div>

        {/* Change Password */}
        <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="h-4 w-4 text-on-surface-variant" />
            <h3 className="text-[14px] font-semibold text-on-surface">
              Change Password
            </h3>
          </div>

          {passwordSuccess && (
            <Alert variant="success">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Password changed successfully
              </span>
            </Alert>
          )}

          {passwordError && (
            <Alert variant="error">{passwordError}</Alert>
          )}

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-on-surface-variant">
              Current Password
            </label>
            <Input
              type="password"
              value={oldPassword}
              onChange={(e) => { setOldPassword(e.target.value); setPasswordError(""); setPasswordSuccess(false); }}
              placeholder="Enter current password"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant">
                New Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                placeholder="Min 8 characters"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant">
                Confirm New Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                placeholder="Repeat new password"
              />
            </div>
          </div>

          <p className="text-[11px] text-on-surface-variant/50">
            Must be at least 8 characters with uppercase, lowercase, number, and symbol.
          </p>

          <Button
            onClick={handlePasswordChange}
            disabled={!oldPassword || !newPassword || changePassword.isPending}
            loading={changePassword.isPending}
            variant="secondary"
            size="sm"
          >
            <Lock className="h-3.5 w-3.5 mr-1.5" />
            Change Password
          </Button>
        </div>
      </div>
    </div>
  );
}
