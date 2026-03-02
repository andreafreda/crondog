🇮🇹 [Leggi in Italiano](README_it.md)

# 🐶 KronDog
**KronDog** is a lightweight, modern web dashboard for monitoring and managing Kubernetes CronJobs directly from your browser. 

Designed for developers and system administrators, KronDog provides a clean UI over the native Kubernetes API, allowing you to instantly view active jobs, check execution history (both scheduled and manually triggered), parse precise validation errors, and manage cron schedules visually, rather than fighting with YAML manifests in the terminal.

## 🚀 Features
- **Dashboard Overview**: Monitor all CronJobs in your selected namespace.
- **Manual Triggers**: Trigger Jobs manually (Run Now) and immediately see them badged as `✋ Manual` in the Last Run columns.
- **Real Last Run Time**: Unlike native `kubectl`, KronDog intelligently computes the _true_ last run time including manual triggers.
- **Schedule Management**: Edit and save `spec.schedule` expressions directly in the browser with real-time Kubernetes API validation errors.
- **Job History**: Click into any CronJob to see a history of recent Jobs, duration, success/failure status, and active pods.
- **Live Pod Logs**: Stream Server-Sent Events (SSE) directly from Kubernetes Pods into the browser terminal.

> ⚠️ **WARNING**: This project is experimental and represents a personal exploration for study and learning purposes. It combines manual development with the use of AI agents to explore new ways of working. It is not production-ready, it may contain bugs or unexpected behavior, and no stability or support is guaranteed. Use at your own risk and for educational purposes! 🎯

## 🛠️ Tech Stack & Versions
This project is built using a modern full-stack Typescript architecture:
- **Framework**: [Next.js](https://nextjs.org/) (`16.1.6`) with App Router
- **UI & Components**: [React](https://react.dev/) (`19.2.3`), [Tailwind CSS](https://tailwindcss.com/) (`^4`), and [Shadcn UI](https://ui.shadcn.com/) (`^3.8.5`)
- **State Management**: [TanStack React Query](https://tanstack.com/query/latest) (`^5.90.21`)
- **Kubernetes Integration**: [Official Kubernetes Client for Node.js](https://github.com/kubernetes-client/javascript) (`@kubernetes/client-node: ^1.4.0`)
- **Icons**: [Lucide React](https://lucide.dev/) (`^0.576.0`)

## 📚 Documentation
For complete instructions on authenticating with your Kubernetes cluster (Minikube, EKS, GKE, etc.) and deploying the application, please refer to the dedicated deployment guide:
👉 **[Authentication & Deployment Guide](docs/authentication-and-deployment.md)**
