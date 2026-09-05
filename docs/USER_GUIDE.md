# SwiftShip — How It Works (A Guide for Everyone)

> **No technical knowledge needed.** This guide explains how SwiftShip works for
> posters, drivers, and admins. Read it from top to bottom if this is your first
> time seeing the app.

---

## What is SwiftShip?

SwiftShip is a way to get things delivered inside Nepal. Post a job → a driver
accepts → you pay → the driver picks up and drops off the package → you both
rate each other at the end. The platform holds the money in escrow so nobody
gets scammed, and the whole thing updates in real time on your phone.

There are **three roles**:

- **Poster** — you need something delivered (a document, a parcel, a box).
- **Driver** — you have a vehicle and want to earn money delivering things.
- **Admin** — you run the platform: approve drivers, resolve problems, release money.

---

## 1. Getting started

### Create an account

1. Go to the website (or open the app on your phone — it works on both).
2. Click **Sign Up** in the top-right corner.
3. Enter your **name**, **email**, **phone number**, and a **password**
   (must be at least 8 characters).
4. Choose your role: **Poster** (I need to send something) or **Driver** (I
   want to deliver things).
5. Click **Create Account**.

> **If you forget your password:** there's no "forgot password" flow yet. Ask
> the admin to reset it, or re-register with a different email.

### Log in

1. Go to the website.
2. Click **Login** in the top-right.
3. Enter your email and password.
4. You'll land on your dashboard.

> You stay logged in for a long time. If you're logged out (or your browser
> was closed for more than a few days), you'll need to log back in.

---

## 2. As a poster — the full flow

### Step 1: Post a shipment

1. Click **New Shipment** in the left sidebar.
2. Fill in four screens:

   **Screen 1 — Pickup and dropoff**
   - Pickup address (start typing — suggestions from the map appear as you type)
   - Pickup contact name and phone number
   - Pickup instructions (optional — e.g. "ring the blue doorbell")
   - Dropoff address
   - Dropoff contact name and phone number
   - Dropoff instructions (optional)

   > The map on the right shows a blue line between the two locations. It's
   > centered on Kathmandu by default and zooms in automatically once both
   > addresses are entered.

   **Screen 2 — Vehicle type**
   - Choose what kind of vehicle you need:
     - 🚲 Bicycle (small documents, up to 5 kg, short distances)
     - 🏍️ Motorcycle / scooter (up to 25 kg)
     - 🚗 Car (up to 50 kg)
     - 🚐 Van (up to 500 kg)
     - 🚚 Truck (up to 2,000 kg)
   - Pick your preferred vehicle. Choosing a bigger vehicle costs more but
     guarantees your item fits.

   **Screen 3 — Price and schedule**
   - The app **automatically suggests a price** based on the distance, vehicle
     type, and pickup date.
   - You can edit the price if the suggestion doesn't match your budget.
   - Pick a delivery date and time window (e.g. "10 AM – 2 PM").
   - Add a package description if needed (e.g. "fragile", "documents", "1 large box").

   **Screen 4 — Review and confirm**
   - Check everything looks right.
   - Click **Confirm Shipment**.

3. After confirming, your job appears in **My Shipments** with status `Posted`.
   This means it's live and drivers can see it.

### Step 2: A driver accepts

- Within minutes (or hours), a nearby driver with the right vehicle type will
  see your job and click **Accept**.
- You'll get a real-time notification (a red dot on the bell icon in the top
  bar, plus a toast message).
- Open the job to see the driver's name, photo, phone number, and vehicle.
- The status changes from `Posted` → `Accepted`.

> The driver's phone number becomes visible to you **only after they accept**.
> Before that, contact info is hidden to protect privacy.

### Step 3: Make the payment

- After a driver accepts, you'll see a **Pay with Khalti** or **Pay with
  eSewa** button on the job.
- Click it. You'll be redirected to your wallet app.
- Approve the payment.
- You're sent back to the job page, which now shows **Paid** and **Delivered**
  badges.

> Your money is held by SwiftShip now. It's not sent to the driver directly.
> The platform will release it **after the job is delivered** and the admin
> has reviewed it. This protects both you and the driver.

### Step 4: The driver picks up

- The status changes to `In Transit`.
- The map on the job page shows the driver's real-time location (a blue dot
  moving along the route). Your browser gets live updates — no refresh needed.
- The driver contacts the pickup contact (you provided their phone number) to
  arrange handoff.

### Step 5: The driver delivers

- When the package is handed over, the driver clicks **Mark Delivered**.
- The status changes to `Delivered`.
- A `Payout` row is created (90% of your payment goes to the driver — this is
  automatic; the platform keeps 10%).

### Step 6: Rate the driver (optional but helpful)

- After delivery, you'll see a **Rate Courier** button on the job page.
- Click it. Give the driver 1–5 stars and write an optional comment.
- The driver's public rating updates instantly.

---

## 3. As a driver — the full flow

### Step 0: Get approved first

You can't accept jobs until you're verified.

1. Go to **Account → Verification** (or click the banner on your dashboard).
2. Fill in:
   - Your **license** (photo of your driving licence)
   - Your **government ID** (citizenship passport, passport, etc.)
   - Your **vehicle registration** (or insurance)
   - Your **vehicle photo**
   - Check the "I agree to background check" box
3. Click **Submit for Review**.
4. An admin reviews your documents. This can take a few hours to a day.
   You'll see a status badge: `Pending`, `Approved`, or `Rejected`.
   - If rejected: you'll see a reason. Fix it and resubmit.

### Step 1: Browse jobs

1. Click **Browse Jobs** in the left sidebar.
2. You see a list of **open jobs** (status = `Posted`) that match your vehicle
   type. Jobs needing a truck won't show up for a bike rider.
3. Each job shows:
   - Pickup and dropoff locations
   - The price you'll earn
   - The package description
   - The pickup window
4. Click any job to see the full detail — addresses, contact info, the route
   on a map, and the poster's rating history.

### Step 2: Accept a job

1. Click **Accept Job**.
2. The job moves to **Your Jobs → Active**.
3. The poster gets a real-time notification.
4. Contact info (poster's phone) becomes visible to you.

> You can only accept one job at a time. If you're en route to a pickup and
> see something urgent, cancel the other job first.

### Step 3: Start the delivery (pickup phase)

1. Open the job's **Active** page on your phone.
2. When you arrive at the pickup address, click **Start Delivery**.
   - This triggers the `in_transit` state.
   - The poster starts seeing your live GPS location on the map.
3. Pick up the package.

### Step 4: Deliver

1. Drive to the dropoff address.
2. Hand the package to the recipient.
3. Click **Mark Delivered**.
   - You'll get a confirmation prompt — make sure you've actually handed it
     over, because you can't undo this.

### Step 5: Get paid

- After delivery + admin review, the 90% payout shows up in your **Earnings**
  page.
- Status: `Pending` (admin hasn't marked it paid) → `Paid` (money is on its
  way to your bank/mobile wallet).
- You can track your total earnings and pending balance at any time on the
  **Earnings** page, which also shows a week-by-week chart.

---

## 4. As an admin — the full flow

Admins use the **admin panel**, accessible at `/admin`.

> **If you're logged in as an admin but see the wrong sidebar:**
> you might be on `/dashboard`. The admin layout automatically kicks in
> — just go to `/admin` and the correct sidebar (Dashboard, Jobs,
> Disputes, Payouts, Verification, Users, Analytics) will appear.

### The sidebar

| Link | What it does |
|---|---|
| **Dashboard** | Overview of the whole platform: total jobs, total revenue, new sign-ups. |
| **Jobs** | List of every job in the system. Search by ID, filter by status. |
| **Disputes** | Jobs that are in a dispute. Review chat, evidence photos, and the timeline. |
| **Payouts** | Driver payouts waiting to be released. Click each to verify and release. |
| **Verification** | Driver sign-ups waiting for licence/approval. Approve or reject. |
| **Users** | Every registered user. Suspend / unsuspend, change role. |
| **Analytics** | Charts: earnings by day, jobs by status, payment method mix. |

### A typical admin day

1. **Morning:** Open the **Verification** tab. You'll see a queue of driver
   applications. For each:
   - Click the job to expand the document thumbnails.
   - Click **Approve** (they can start accepting jobs immediately) or
   - Click **Reject** and write a reason (the driver can resubmit).
   - There are **count badges** on each tab (Pending / Approved / Rejected)
     so you know how many are in each state.

2. **Midday:** Check **Disputes** for any active ones. Click into each:
   - Read the chat transcript (all messages between poster and driver).
   - Look at uploaded evidence (damaged package photos, etc.).
   - Click **Resolve** and choose:
     - Cancel + refund (poster gets money back, driver gets nothing)
     - Pay driver (driver gets 100%, poster gets nothing)
     - Split (you choose the amounts)
   - Both the poster and driver get a real-time notification of the outcome.

3. **Afternoon:** Check **Payouts**. Drivers get paid automatically after
   delivery, but you review them before releasing the final cash:
   - Click a payout row to see the driver's name, the job, the gateway used,
     and the amount.
   - Click **Mark as Paid** to confirm money was transferred to the driver
     (via bank, cash, or eSewa — however your team handles it).
   - The driver sees it update on their Earnings page immediately.

4. **End of day:** Browse **Analytics** to see what happened:
   - GMV (total money that flowed through the platform)
   - Your take (the 10% fee)
   - Average order value
   - Daily job volume
   - Payment method breakdown (how many Khalti vs eSewa)

---

## 5. How money works

### The 90/10 split

- **Poster pays:** the full price you set (e.g. NPR 1,000).
- **Platform takes:** 10% (NPR 100).
- **Driver gets:** 90% (NPR 900), once you confirm delivery.

You can see this split breakdown on the admin payout details page.

### How a poster pays

Only **Nepali payment methods** are supported:

| Gateway | How you use it |
|---|---|
| **Khalti** | Click Pay → redirected to Khalti app/web → approve → redirected back |
| **eSewa** | Click Pay → a form pops up on the page → enter your OTP → approved |

> **The platform does NOT touch your payment details.** You enter them directly
> on Khalti or eSewa's official page. The platform only gets a confirmation
> from the gateway that the payment succeeded.

### What the platform does server-side

1. The gateway redirects you back to `/payment/success`.
2. The server **checks with Khalti/eSewa's own API** — "did this payment really
   happen?" (Never trusting the redirect alone.)
3. Records a `PaymentTransaction` in the database (so the same payment can't be
   processed twice if you refresh or click back).
4. Creates a `Payout` row for the driver (90%) in `Pending` status.
5. Marks the job as `Paid`.

If something fails, you're sent to `/payment/failure` with a reason.

### Payout timing

- The platform creates the payout record when the job is delivered.
- **You (admin) manually mark it "Paid"** after you've transferred the cash
  to the driver.
- Drivers see this as a status badge — `Pending` means "SwiftShip owes me",
  `Paid` means "money released".

---

## 6. How real-time works (the live bits)

Several things happen instantly without you refreshing the page. This uses
**Pusher**, a real-time service:

- **Live driver map:** when a driver starts a job, their phone sends GPS
  pings every 10 seconds. The poster's map shows the moving blue dot.
- **Notifications:** when someone accepts your job, sends you a message,
  or marks something paid, a toast appears top-right and a red dot appears
  on the bell icon.
- **Job status:** when a status changes (Posted → Accepted → In Transit →
  Delivered), both the poster and driver see it instantly.

**The notification bell** is your inbox. Click it to see all notifications.
Click the three-dot "Mark all as read", or click any item to jump to the
relevant page.

---

## 7. Chat

Every job that's been accepted has a **message thread**:
- The poster and driver can message each other.
- You can send text, emoji, or photos.
- Messages appear in order, newest at the bottom.
- New messages show a red badge and push-notification toast.

To open chat:
- From the job detail page, click the **Chat** button.
- Or click any message in your **bell notifications**.

When you're on the chat page for a job, other unread messages in *that*
thread are silently marked as read (no spam badge).

---

## 8. Ratings

After a job is delivered, the poster can rate the driver:
1. Open the delivered job.
2. Click **Rate Courier**.
3. Select 1 to 5 stars.
4. (Optional) Write a comment.
5. Click **Submit**.

Driver profiles show their average rating:
- 5-star scale
- A badge: "New driver" (no ratings yet), or a number like "4.8 (127 ratings)"
- A public reviews list (everyone can see who rated and what they said, but
  not the rating the *driver* gave back)

---

## 9. The mobile experience

SwiftShip fully works on phones. It's designed mobile-first:

- The left sidebar becomes a **hamburger menu** on small screens.
- There's a **bottom navigation bar** on mobile for the most-used links.
- All buttons are at least 48px tall (Apple + Google's minimum touch target).
- Maps, forms, and tables reflow to a single column.

**Recommended phones to test on:** iPhone SE (375px), iPhone 14 (390px),
iPad (768px). Everything should work. If it doesn't, it's a bug.

---

## 0. How to test it yourself

To test the full flow locally:

### 0.1 Prerequisites
- You need MongoDB Atlas (or a local MongoDB) set up.
- Copy `.env.example` → `.env.local` and fill in your keys.
- Run `npm run dev` (dev server on `http://localhost:3000`).

### 0.2 Seeding test users
A script is included to populate test accounts:

```powershell
# PowerShell
node scripts/reset-user-passwords.mjs

# or bash
npx tsx scripts/reset-user-passwords.mjs
```

This resets three known accounts every time you run it:
- `admin@test.com` / `Admin123!` → role: admin
- `poster@test.com` / `Poster123!` → role: poster
- `driver@test.com` / `Driver123!` → role: driver

Each run overwrites the password, so if you ever forget a password: just
re-run the script.

### 0.3 The full happy-path test
Do this with two browser tabs (or two different browsers) to act as both
poster and driver simultaneously:

**Tab A — Poster:**
1. Register → log in as poster.
2. Click **New Shipment**.
3. Fill in pickup = "New Road, Kathmandu", dropoff = "Lazimpat, Kathmandu".
4. Choose "Motorcycle / scooter".
5. Let the price auto-suggest, then click **Confirm Shipment**.
6. Your job appears in "My Shipments" with status `Posted`.

**Tab B — Driver (log in as driver@test.com):**
1. Go to **Browse Jobs**.
2. Find your poster's job (it has the same pickup/dropoff).
3. Click **Accept Job**.
4. Wait 5 seconds.

**Back in Tab A:**
1. You'll get a bell notification. Click it.
2. Click **Pay** → pick Khalti (or eSewa).
3. Approve the payment on the gateway page.
4. You'll be redirected back. The job shows `Paid`.

**Back in Tab B:**
1. Click the job → it's in **Your Jobs → Active**.
2. Click **Start Delivery**.
3. Click **Mark Delivered**.

**In Tab A:**
1. The job shows `Delivered`.
2. Click **Rate Courier** → leave a 5-star rating + comment.
3. Done!

This full 7-step round-trip takes about 2 minutes and exercises: auth, job
creation, real-time notification, live map, payment gateway mock, driver
flow, and ratings. Everything else builds on this.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Invalid credentials" on login | Your password is wrong, or the user doesn't exist. Run `node scripts/reset-user-passwords.mjs` to reset test accounts. If your user was created by another AI or was deleted from the DB, re-register it. |
| "Too many login attempts" | You tried logging in more than 10 times in 15 minutes. Wait 15 minutes and try again. In dev, restarting `npm run dev` clears this. |
| Map is zoomed out / centered on the ocean | The addresses you entered could not be geocoded. The fallback returns a point near Kathmandu. Try a more specific address (e.g. "New Road Gate, Kathmandu" instead of just "New Road"). |
| Driver can't see my job in Browse | Check that the vehicle type matches the driver's. A job needing a truck will not show for a motorcycle driver. |
| Payment failed / "server error" | Check the server terminal (where you ran `npm run dev`). The real error is logged there with a context tag. The browser only sees a generic "Internal server error." |
| "Account is suspended" | An admin suspended your account. Contact support@swiftship.com. |
| Can't find the job ID | Click the job — the URL is `/jobs/[id]` where `[id]` is a long hex string. The 6-character shortened ID (e.g. `JOB-8F2A3C`) is shown at the top of the job page for human reference. |

---

## Glossary (plain English)

| Term | What it means |
|---|---|
| **Job** | A delivery request. One poster creates it, one driver does it, it has a price. |
| **Posted** | The job is live. Drivers can see and accept it. |
| **Accepted** | A driver has accepted your job. Their details are now visible to you. |
| **In Transit** | The driver picked the package up and is on the way. The map shows their live location. |
| **Delivered** | The driver marked the package as handed over. Waiting for you to rate them. |
| **Disputed** | Someone opened a dispute. An admin is investigating. |
| **Payout** | The money the platform owes the driver. 90% of the job price. Created automatically on delivery, released manually by admin. |
| **Pending payout** | "We created a payout for you but haven't transferred it yet." |
| **Notification** | A real-time alert (bell icon + toast) that appears when something happens on a job you care about. |
| **Background check** | The admin review of your licence + ID before approving you as a driver. |
| **Khalti / eSewa** | The two digital wallets supported in Nepal for paying for deliveries. |
| **JWT** | A login token stored in a hidden cookie. Keeps you logged in across page loads. |
| **JWT access token** | Expires in 15 minutes. If it expires, the app silently swaps in a refresh token. |
| **JWT refresh token** | Expires in 7 days. One per user — if you log in on a new browser, it ends the old session. |
| **GPS ping** | A single position report from the driver's phone, sent every 10 seconds. |
| **Route line** | The blue curved line on the map between pickup and dropoff. Drawn from map data. |
