public class Main {
    public static void main(String[] args) {
        String str = "Hello123@";

        boolean isAlphanumeric = str.matches("[a-zA-Z0-9]+");
        boolean hasVowel = str.matches(".*[aeiouAEIOU].*");
        boolean hasConsonant = str.matches(".*[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ].*");

        if (isAlphanumeric && hasVowel && hasConsonant) {
            System.out.println("Valid string");
        } else {
            System.out.println("Invalid string");
        }
    }
}